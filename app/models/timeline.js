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
    if (_.isUndefined(offset))
      offset = this.offset
    else
      if (offset < 0) offset = 0
    // -1 = special magic number, meaning “do not use limit defaults,
    // do not use passed in value, use 0 instead". this is at the very least
    // used in Timeline.merge()
    if (_.isUndefined(limit))
      limit = this.limit
    else
      if (limit < 0) limit = 0

    var that = this
    return new Promise(function(resolve, reject) {
      that.validateCanShow(that.currentUser)
        .then(function(valid) {
          // this is a private timeline
          if (!valid)
            limit = -1

          return database.zrevrangeAsync(mkKey(['timeline', that.id, 'posts']), offset, offset+limit-1)
        })
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
    if (_.isUndefined(offset))
      offset = this.offset
    else
      if (offset < 0) offset = 0

    if (_.isUndefined(limit))
      limit = this.limit
    else
      if (limit < 0) limit = 0

    var that = this
    var p_post
    var p_banIds

    return new Promise(function(resolve, reject) {
      that.getPostIds(offset, limit).bind({})
        .then(function(postIds) {
          return Promise.map(postIds, function(postId) {
            return Post.findById(postId, { currentUser: that.currentUser })
          })
        })
        .then(function(posts) {
          this.posts = posts
          return that.currentUser ? models.User.findById(that.currentUser) : null
        })
        .then(function(user) {
          return user ? user.getBanIds() : []
        })
        .then(function(banIds) {
          p_banIds = banIds
          return Promise.map(this.posts, function(post) {
            return models.User.findById(post.userId).then(function(user) {
              return user.getBanIds()
            }).then(function(reverseBanIds) {
              return ((p_banIds.indexOf(post.userId) >= 0) || (reverseBanIds.indexOf(that.currentUser) >= 0)) ? null : post
            })
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

  Timeline.prototype.unmerge = async function(timelineId) {
    // zinterstore saves results to a key. so we have to
    // create a temporary storage
    var randomKey = mkKey(['timeline', this.id, 'random', uuid.v4()])

    await database.zinterstoreAsync(
      randomKey,
      2,
      mkKey(['timeline', timelineId, 'posts']),
      mkKey(['timeline', this.id, 'posts']),
      'AGGREGATE', 'MAX')

    var postIds = await database.zrangeAsync(randomKey, 0, -1)
    await* _.flatten(postIds.map((postId) => [
      database.sremAsync(mkKey(['post', postId, 'timelines']), timelineId),
      database.zremAsync(mkKey(['timeline', timelineId, 'posts']), postId)
    ]))

    return database.delAsync(randomKey)
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
          if (includeSelf && (that.isPosts() || that.isDirects())) {
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
    return await* subscribers.map((subscriber) => subscriber.getRiverOfNewsTimelineId())
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

  Timeline.prototype.isDirects = function() {
    return this.name === "Directs"
  }

  Timeline.prototype.isHides = function() {
    return this.name === "Hides"
  }

  Timeline.prototype.updatePost = async function(postId, action) {
    var currentTime = new Date().getTime()

    var score = await database.zscoreAsync(mkKey(['timeline', this.id, 'posts']), postId)

    // For the time being like does not bump post
    if (action === "like" && score != null)
      return

    await* [
      database.zaddAsync(mkKey(['timeline', this.id, 'posts']), currentTime, postId),
      database.saddAsync(mkKey(['post', postId, 'timelines']), this.id),
      database.hsetAsync(mkKey(['post', postId]), 'updatedAt', currentTime)
    ]

    var feed = await this.getUser()

    // does not update lastActivity on like
    if (action === 'like')
      return null
    else
      return feed.updateLastActivityAt()
  }

  Timeline.prototype.turnIntoPrivate = function() {
    this.posts = []
    this.postIds = []
    this.limit = 0

    return this
  }

  Timeline.prototype.validateCanShow = async function(userId) {
    // owner can read her posts
    if (this.userId === userId)
      return true

    // if post is already in user's feed then she can read it
    if (this.isDirects())
      return this.userId === userId

    // this is a public feed, anyone can read public posts, this is
    // a free country
    var user = await this.getUser()
    if (user && user.isPrivate !== '1')
      return true

    // otherwise user can view post if and only if she is subscriber
    var userIds = await this.getSubscriberIds()
    return userIds.indexOf(userId) >= 0
  }

  return Timeline
}
