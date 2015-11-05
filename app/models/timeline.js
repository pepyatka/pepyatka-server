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
  Timeline.initObject = Timeline.super_.initObject
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
            .then(function(feed) { return feed.updateLastActivityAt() })
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

  Timeline.prototype.getPostIds = async function(offset, limit) {
    if (_.isUndefined(offset))
      offset = this.offset
    else if (offset < 0)
      offset = 0

    // -1 = special magic number, meaning “do not use limit defaults,
    // do not use passed in value, use 0 instead". this is at the very least
    // used in Timeline.mergeTo()
    if (_.isUndefined(limit))
      limit = this.limit
    else if (limit < 0)
      limit = 0

    let valid = await this.validateCanShow(this.currentUser)

    if (!valid)
      return []

    this.postIds = await database.zrevrangeAsync(
      mkKey(['timeline', this.id, 'posts']),
      offset, offset + limit - 1
    )

    return this.postIds
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

  Timeline.prototype.getPosts = async function(offset, limit) {
    if (_.isUndefined(offset))
      offset = this.offset
    else if (offset < 0)
      offset = 0

    if (_.isUndefined(limit))
      limit = this.limit
    else if (limit < 0)
      limit = 0

    let reader = this.currentUser ? (await models.User.findById(this.currentUser)) : null
    let banIds = reader ? (await reader.getBanIds()) : []

    let postIds = await this.getPostIds(offset, limit)
    let posts = (await Promise.all(postIds.map(postId => Post.findById(postId, { currentUser: this.currentUser })))).filter(Boolean)

    let usersCache = {}
    async function userById(id) {
      if (!(id in usersCache)) {
        let user = await models.User.findById(id)

        if (!user) {
          throw new Error(`no user for id=${id}`)
        }

        let bans = await user.getBanIds()

        usersCache[id] = [user, bans]
      }

      return usersCache[id]
    }

    posts = await Promise.all(posts.map(async (post) => {
      if (post.userId === this.currentUser) {
        // shortcut for the author
        return post
      }

      let author, reverseBanIds

      try {
        [author, reverseBanIds] = await userById(post.userId)
      } catch (e) {
        throw new Error(`did not find user-object of author of post with id=${post.id}\nPREVIOUS: ${e.message}`)
      }

      let readerBannedAuthor = (banIds.indexOf(post.userId) >= 0)
      let authorBannedReader = (reverseBanIds.indexOf(this.currentUser) >= 0)

      if (readerBannedAuthor || authorBannedReader)
        return null

      if (author.isPrivate) {
        let postTimelines = await post.getTimelines()
        let promises = postTimelines.map(async (timeline) => {
          if (!timeline.isPosts() && !timeline.isDirects()) {
            return false
          }

          return timeline.validateCanShow(this.currentUser)
        })

        let wasPostedToReadableFeed = _.any(await Promise.all(promises))

        if (!wasPostedToReadableFeed) {
          return null
        }
      }

      return post
    }))

    this.posts = posts.filter(Boolean)

    return this.posts
  }

  /**
   * Merges contents of this timeline into timeline specified by id
   * @param timelineId
   */
  Timeline.prototype.mergeTo = async function(timelineId) {
    await database.zunionstoreAsync(
      mkKey(['timeline', timelineId, 'posts']), 2,
      mkKey(['timeline', timelineId, 'posts']),
      mkKey(['timeline', this.id, 'posts']),
      'AGGREGATE', 'MAX'
    )

    let timeline = await Timeline.findById(timelineId)
    let postIds = await timeline.getPostIds(0, -1)

    let promises = postIds.map(postId => database.saddAsync(mkKey(['post', postId, 'timelines']), timelineId))

    await Promise.all(promises)
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
    await Promise.all(_.flatten(postIds.map((postId) => [
      database.sremAsync(mkKey(['post', postId, 'timelines']), timelineId),
      database.zremAsync(mkKey(['timeline', timelineId, 'posts']), postId)
    ])))

    return database.delAsync(randomKey)
  }

  Timeline.prototype.getUser = function() {
    return models.FeedFactory.findById(this.userId)
  }

  /**
   * Returns the IDs of users subscribed to this timeline, as a promise.
   */
  Timeline.prototype.getSubscriberIds = async function(includeSelf) {
    let userIds = await database.zrevrangeAsync(mkKey(['timeline', this.id, 'subscribers']), 0, -1)

    // A user is always subscribed to their own posts timeline.
    if (includeSelf && (this.isPosts() || this.isDirects())) {
      userIds = _.uniq(userIds.concat([this.userId]))
    }

    this.subscriberIds = userIds

    return userIds
  }

  Timeline.prototype.getSubscribers = async function(includeSelf) {
    var userIds = await this.getSubscriberIds(includeSelf)
    var promises = userIds.map((userId) => models.User.findById(userId))

    this.subscribers = await Promise.all(promises)

    return this.subscribers
  }

  /**
   * Returns the list of the 'River of News' timelines of all subscribers to this
   * timeline.
   */
  Timeline.prototype.getSubscribedTimelineIds = async function() {
    var subscribers = await this.getSubscribers(true);
    return await Promise.all(subscribers.map((subscriber) => subscriber.getRiverOfNewsTimelineId()))
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

    await Promise.all([
      database.zaddAsync(mkKey(['timeline', this.id, 'posts']), currentTime, postId),
      database.saddAsync(mkKey(['post', postId, 'timelines']), this.id),
      database.hsetAsync(mkKey(['post', postId]), 'updatedAt', currentTime)
    ])

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
