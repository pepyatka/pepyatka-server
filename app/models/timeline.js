"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require("util").inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , FeedFactory = models.FeedFactory
  , Post = models.Post
  , mkKey = require("../support/models").mkKey
  , pubSub = models.PubSub
  , _ = require('lodash')

exports.addModel = function(database) {
  /**
   * @constructor
   */
  var Timeline = function(params) {
    Timeline.super_.call(this)

    this.id = params.id
    this.name = params.name
    this.userId = params.userId
    if (parseInt(params.createdAt, 10))
      this.createdAt = params.createdAt
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = params.updatedAt
    this.offset = parseInt(params.offset, 10) || 0
    this.limit = parseInt(params.limit, 10) || 30
    this.currentUser = params.currentUser
  }

  inherits(Timeline, AbstractModel)

  Timeline.className = Timeline
  Timeline.namespace = "timeline"
  Timeline.findById = Timeline.super_.findById

  Object.defineProperty(Timeline.prototype, 'name', {
    get: function() { return this.name_ },
    set: function(newValue) {
      newValue ? this.name_ = newValue.trim() : this.name_ = ''
    }
  })

  /**
   * Adds the specified post to all timelines where it needs to appear
   * (the timelines of the feeds to which it is posted, the River of News
   * timeline of the posting user and the River of News timelines of all
   * subscribers of the feeds to which it is posted).
   */
  Timeline.publishPost = function(post) {
    var that = this
    var currentTime = new Date().getTime()

    // We can use post.timelineIds here instead of post.getPostedToIds
    // because we are about to create that post and have just received
    // a request from user, so postedToIds == timelineIds here
    return Promise.map(post.timelineIds, function(timelineId) {
      return Timeline.findById(timelineId)
    })
      .then(function(timelines) {
        return Promise.map(timelines, function(timeline) {
          return timeline.getUser()
            .then(function(user) { return user.updateLastActivityAt() })
            .then(function() { return timeline.getSubscribedTimelineIds() })
        })
      })
      .then(function(allSubscribedTimelineIds) {
        var allTimelines = _.uniq(
          _.union(post.timelineIds, _.flatten(allSubscribedTimelineIds)))
        return Promise.map(allTimelines, function(timelineId) {
          return Promise.all([
            database.zaddAsync(mkKey(['timeline', timelineId, 'posts']), currentTime, post.id),
            database.hsetAsync(mkKey(['post', post.id]), 'updatedAt', currentTime),
            database.saddAsync(mkKey(['post', post.id, 'timelines']), timelineId)
          ])
        })
      })
      .then(function() { return pubSub.newPost(post.id) })
  }

  Timeline.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid

      valid = this.name
        && this.name.length > 0
        && this.userId
        && this.userId.length > 0

      valid ? resolve(valid) : reject(new Error("Invalid"))
    }.bind(this))
  }

  Timeline.prototype.validateOnCreate = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      Promise.join(that.validate(),
                   that.validateUniquness(mkKey(['timeline', that.id])),
                   function(valid, idIsUnique) {
                     resolve(that)
                   })
        .catch(function(e) { reject(e) })
      })
  }

  Timeline.prototype.create = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.createdAt = new Date().getTime()
      that.updatedAt = new Date().getTime()
      if (!that.id)
        that.id = uuid.v4()

      that.validateOnCreate()
        .then(function(timeline) {
          return Promise.all([
            database.hmsetAsync(mkKey(['user', that.userId, 'timelines']),
                                that.name, that.id),
            database.hmsetAsync(mkKey(['timeline', that.id]),
                                { 'name': that.name,
                                  'userId': that.userId,
                                  'createdAt': that.createdAt.toString(),
                                  'updatedAt': that.updatedAt.toString()
                                })
          ])
        })
        .then(function(res) { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  Timeline.prototype.getPostIds = function(offset, limit) {
    var that = this

    if (!offset || !limit) {
      offset = this.offset
      limit = this.limit
    }

    return new Promise(function(resolve, reject) {
      database.zrevrangeAsync(mkKey(['timeline', that.id, 'posts']), offset, offset+limit-1)
        .then(function(postIds) {
          that.postIds = postIds
          resolve(that.postIds)
        })
    })
  }

  Timeline.prototype.getPostIdsByScore = function(min, max) {
    var that = this

    return new Promise(function(resolve, reject) {
      database.zrevrangebyscoreAsync(mkKey(['timeline', that.id, 'posts']), min, max)
        .then(function(postIds) {
          that.postIds = postIds
          resolve(that.postIds)
        })
    })
  }

  Timeline.prototype.getPosts = function(offset, limit) {
    var that = this

    if (!offset || !limit) {
      offset = this.offset
      limit = this.limit
    }

    return new Promise(function(resolve, reject) {
      that.getPostIds(offset, limit)
        .then(function(postIds) {
          return Promise.map(postIds, function(postId) {
            return Post.findById(postId, { currentUser: that.currentUser })
          })
        })
        .then(function(posts) {
          that.posts = posts.filter(Boolean)
          resolve(that.posts)
        })
    })
  }

  Timeline.prototype.merge = function(timelineId) {
    var that = this

    return new Promise(function(resolve, reject) {
      database.zunionstoreAsync(
        mkKey(['timeline', timelineId, 'posts']), 2,
        mkKey(['timeline', timelineId, 'posts']),
        mkKey(['timeline', that.id, 'posts']),
        'AGGREGATE', 'MAX')
        .then(function() { return Timeline.findById(timelineId) })
        .then(function(timeline) { return timeline.getPostIds(0, -1) })
        .then(function(postIds) {
          return Promise.map(postIds, function(postId) {
            return database.sadd(mkKey(['post', postId, 'timelines']), timelineId)
          })
        })
        .then(function(res) { resolve(res) })
    })
  }

  Timeline.prototype.unmerge = function(timelineId) {
    var that = this

    return new Promise(function(resolve, reject) {
      // zinterstore saves results to a key. so we have to
      // create a temporary storage
      var randomKey = mkKey(['timeline', that.id, 'random', uuid.v4()])

      database.zinterstoreAsync(
        randomKey, 2,
        mkKey(['timeline', timelineId, 'posts']),
        mkKey(['timeline', that.id, 'posts']),
        'AGGREGATE', 'MAX')
        .then(function() { return database.zrangeAsync(randomKey, 0, -1) })
        .then(function(postIds) {
          return Promise.map(postIds, function(postId) {
            return Promise.all([
              database.sremAsync(mkKey(['post', postId, 'timelines']), timelineId),
              database.zremAsync(mkKey(['timeline', timelineId, 'posts']), postId)
            ])
          })
        })
        .then(function() { return database.delAsync(randomKey) })
        .then(function(res) { resolve(res) })
    })
  }

  Timeline.prototype.getUser = function() {
    return models.FeedFactory.findById(this.userId)
  }

  /**
   * Returns the IDs of users subscribed to this timeline, as a promise.
   */
  Timeline.prototype.getSubscriberIds = function(includeSelf) {
    var that = this

    return new Promise(function(resolve, reject) {
      database.zrevrangeAsync(mkKey(['timeline', that.id, 'subscribers']), 0, -1)
        .then(function(userIds) {
          // A user is always subscribed to their own posts timeline.
          if (includeSelf && that.isPosts()) {
            userIds = _.uniq(userIds.concat([that.userId]))
          }
          that.subscriberIds = userIds
          resolve(userIds)
        })
    })
  }

  Timeline.prototype.getSubscribers = async function(includeSelf) {
    var userIds = await this.getSubscriberIds(includeSelf)
    var promises = userIds.map((userId) => models.User.findById(userId))

    this.subscribers = await* promises

    return this.subscribers
  }

  /**
   * Returns the list of the 'River of News' timelines of all subscribers to this
   * timeline.
   */
  Timeline.prototype.getSubscribedTimelineIds = async function() {
    var subscribers = await this.getSubscribers(true);
    return subscribers.map((subscriber) => subscriber.getRiverOfNewsTimelineId())
  }

  Timeline.prototype.isRiverOfNews = function() {
    return this.name === "RiverOfNews"
  }

  Timeline.prototype.isPosts = function() {
    return this.name === "Posts"
  }

  Timeline.prototype.isLikes = function() {
    return this.name === "Likes"
  }

  Timeline.prototype.isComments = function() {
    return this.name === "Comments"
  }

  Timeline.prototype.isHides = function() {
    return this.name === "Hides"
  }

  Timeline.prototype.updatePost = function(postId, action) {
    var currentTime = new Date().getTime()
    var that = this

    return new Promise(function(resolve, reject) {
      database.zscoreAsync(mkKey(['timeline', that.id, 'posts']), postId).bind({})
        .then(function(score) {
          // For the time being like does not bump post
          if (action === "like" && score != null)
            return

          return database.zaddAsync(mkKey(['timeline', that.id, 'posts']), currentTime, postId)
        })
        .then(function(res) { return database.saddAsync(mkKey(['post', postId, 'timelines']), that.id) })
        .then(function(res) { return database.hsetAsync(mkKey(['post', postId]), 'updatedAt', currentTime) })
        .then(function(post) { return that.getUser() })
        .then(function(feed) {
          // does not update lastActivity on like
          if (action === 'like')
            return null
          else
            return feed.updateLastActivityAt()
        })
        .then(function() { resolve() })
    })
  }

  return Timeline
}
