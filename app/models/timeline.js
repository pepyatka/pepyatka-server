"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require("util").inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , Post = models.Post
  , mkKey = require("../support/models").mkKey

exports.addModel = function(database) {
  var Timeline = function(params) {
    Timeline.super_.call(this)

    this.id = params.id
    this.name = params.name
    this.userId = params.userId
    if (parseInt(params.createdAt, 10))
      this.createdAt = params.createdAt
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = params.updatedAt
    this.start = parseInt(params.start, 10) || 0
    this.num = parseInt(params.num, 10) || 25
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

  Timeline.newPost = function(postId) {
    var that = this
    var currentTime = new Date().getTime()

    return new Promise(function(resolve, reject) {
      Post.findById(postId)
        .then(function(post) { return post.getSubscribedTimelineIds() })
        .then(function(timelineIds) {
          return Promise.map(timelineIds, function(timelineId) {
            return Promise.all([
              database.zaddAsync(mkKey(['timeline', timelineId, 'posts']), currentTime, postId),
              database.hsetAsync(mkKey(['post', postId]), 'updatedAt', currentTime),
              database.saddAsync(mkKey(['post', postId, 'timelines']), timelineId)
            ])
          })
        })
        .then(function(res) { resolve(that) })
    })
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
                                  'updatedAt': that.updatedAt.toString(),
                                })
          ])
        })
        .then(function(res) { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  Timeline.prototype.getPostIds = function(start, num) {
    var that = this

    if (!start || !num) {
      start = this.start
      num = this.num
    }

    return new Promise(function(resolve, reject) {
      database.zrevrangeAsync(mkKey(['timeline', that.id, 'posts']), start, start+num-1)
        .then(function(postIds) {
          that.postIds = postIds
          resolve(that.postIds)
        })
    })
  }

  Timeline.prototype.getPosts = function(start, num) {
    var that = this

    if (!start || !num) {
      start = this.start
      num = this.num
    }

    return new Promise(function(resolve, reject) {
      that.getPostIds(start, num)
        .then(function(postIds) {
          return Promise.map(postIds, function(postId) {
            return Post.findById(postId)
          })
        })
        .then(function(posts) {
          that.posts = posts
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

  Timeline.prototype.getSubscriberIds = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.zrevrangeAsync(mkKey(['timeline', that.id, 'subscribers']), 0, -1)
        .then(function(userIds) {
          that.subscriberIds = userIds
          resolve(userIds)
        })
    })
  }

  Timeline.prototype.getSubscribers = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getSubscriberIds()
        .then(function(userIds) {
          return Promise.map(userIds, function(userId) {
            return models.User.findById(userId)
          })
        })
        .then(function(subscribers) {
          that.subscribers = subscribers
          resolve(that.subscribers)
        })
    })
  }

  Timeline.prototype.updatePost = function(postId) {
    var currentTime = new Date().getTime()
    var that = this

    return new Promise(function(resolve, reject) {
      database.zaddAsync(mkKey(['timeline', that.id, 'posts']), currentTime, postId)
        .then(function(res) { return database.saddAsync(mkKey(['post', postId, 'timelines']), that.id) })
        .then(function(res) { return database.hsetAsync(mkKey(['post', postId]), 'updatedAt', currentTime) })
        .then(function(res) { resolve(res) })
    })
  }

  return Timeline
}
