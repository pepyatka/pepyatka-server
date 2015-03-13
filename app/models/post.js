"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require("util").inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , FeedFactory = models.FeedFactory
  , Timeline = models.Timeline
  , mkKey = require("../support/models").mkKey

exports.addModel = function(database) {
  var Post = function(params) {
    Post.super_.call(this)

    this.id = params.id
    this.body = params.body
    this.userId = params.userId
    if (parseInt(params.createdAt, 10))
      this.createdAt = params.createdAt
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = params.updatedAt
  }

  inherits(Post, AbstractModel)

  Post.className = Post
  Post.namespace = "post"
  Post.findById = Post.super_.findById

  Object.defineProperty(Post.prototype, 'body', {
    get: function() { return this.body_ },
    set: function(newValue) {
      newValue ? this.body_ = newValue.trim() : this.body_ = ''
    }
  })

  Post.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid

      valid = this.body
        && this.body.length > 0
        && this.userId
        && this.userId.length > 0

      valid ? resolve(valid) : reject(new Error("Invalid"))
    }.bind(this))
  }

  Post.prototype.validateOnCreate = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      Promise.join(that.validate(),
                   that.validateUniquness(mkKey(['post', that.id])),
                   function(valid, idIsUnique) {
                     resolve(that)
                   })
        .catch(function(e) { reject(e) })
      })
  }

  Post.prototype.create = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.createdAt = new Date().getTime()
      that.updatedAt = new Date().getTime()
      that.id = uuid.v4()

      that.validateOnCreate()
        .then(function(post) {
          return Promise.all([
            database.hmsetAsync(mkKey(['post', post.id]),
                                { 'body': post.body,
                                  'userId': post.userId,
                                  'createdAt': post.createdAt.toString(),
                                  'updatedAt': post.updatedAt.toString(),
                                }),
            models.Timeline.newPost(post.id)
          ])
        })
        .then(function(res) { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  Post.prototype.update = function(params) {
  }

  Post.prototype.getSubscribedTimelineIds = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      FeedFactory.findById(that.userId)
        .then(function(feed) {
          return Promise.all([
            feed.getRiverOfNewsTimelineId(),
            feed.getPostsTimelineId()
          ])
        })
        .then(function(timelines) { resolve(timelines) })
    })
  }

  Post.prototype.getTimelineIds = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.smembersAsync(mkKey(['post', that.id, 'timelines']))
        .then(function(timelineIds) {
          that.timelineIds = timelineIds || []
          resolve(that.timelineIds)
        })
    })
  }

  Post.prototype.getGenericFriendOfFriendTimelines = function(userId, type) {
    var that = this
    var timelineIds = []
    var user

    return new Promise(function(resolve, reject) {
      models.User.findById(userId)
        .then(function(newUser) {
          user = newUser
          return user['get' + type + 'Timeline']()
        })
        .then(function(timeline) {
          timelineIds.push(timeline.id)
          return timeline.getSubscribers()
        })
        .then(function(users) {
          return Promise.map(users, function(user) {
            return user.getRiverOfNewsTimelineId()
          })
        })
        .then(function(subscribedTimelineIds) {
          timelineIds = timelineIds.concat(subscribedTimelineIds)
          return that.getSubscribedTimelineIds()
        })
        .then(function(subscribedTimelineIds) {
          timelineIds = timelineIds.concat(subscribedTimelineIds)
          return user.getRiverOfNewsTimelineId()
         })
        .then(function(timelineId) {
          timelineIds.push(timelineId)
          return Promise.map(timelineIds, function(timelineId) {
            return models.Timeline.findById(timelineId)
          })
        })
        .then(function(timelines) {
          resolve(timelines)
        })
    })
  }

  Post.prototype.getLikesFriendOfFriendTimelines = function(userId) {
    return this.getGenericFriendOfFriendTimelines(userId, 'Likes')
  }

  Post.prototype.getCommentsFriendOfFriendTimelines = function(userId) {
    return this.getGenericFriendOfFriendTimelines(userId, 'Comments')
  }

  Post.prototype.addComment = function(commentId) {
    var that = this
    var timelineIds = []
    var user

    return new Promise(function(resolve, reject) {
      models.Comment.findById(commentId)
        .then(function(comment) { return that.getCommentsFriendOfFriendTimelines(comment.userId) })
        .then(function(timelines) {
          return Promise.map(timelines, function(timeline) {
            return timeline.updatePost(that.id)
          })
        })
        .then(function() {
          return database.saddAsync(mkKey(['post', that.id, 'comments']), commentId)
        })
        .then(function(res) { resolve(res) })
    })
  }

  Post.prototype.addLike = function(userId) {
    var that = this
    var timelineIds = []
    var user

    return new Promise(function(resolve, reject) {
      that.getLikesFriendOfFriendTimelines(userId)
        .then(function(timelines) {
          return Promise.map(timelines, function(timeline) {
            return timeline.updatePost(that.id)
          })
        })
        .then(function() {
          return database.saddAsync(mkKey(['post', that.id, 'likes']), userId)
        })
        .then(function(res) { resolve(res) })
    })
  }

  return Post
}
