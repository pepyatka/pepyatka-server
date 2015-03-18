"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require("util").inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , FeedFactory = models.FeedFactory
  , Timeline = models.Timeline
  , mkKey = require("../support/models").mkKey
  , _ = require('underscore')

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
    var that = this

    return new Promise(function(resolve, reject) {
      that.updatedAt = new Date().getTime()
      that.body = params.body

      that.validate()
        .then(function(post) {
          database.hmsetAsync(mkKey(['post', that.id]),
                              { 'body': that.body,
                                'updatedAt': that.updatedAt.toString()
                              })
        })
        .then(function() { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  Post.prototype.destroy = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      Promise.all([
        // remove post from all timelines
        that.getTimelineIds()
          .then(function(timelineIds) {
            Promise.map(timelineIds, function(timelineId) {
              return Promise.all([
                database.sremAsync(mkKey(['post', that.id, 'timelines']), timelineId),
                database.zremAsync(mkKey(['timeline', timelineId, 'posts']), that.id)
              ])
                .then(function() {
                  database.zcardAsync(mkKey(['timeline', timelineId, 'posts']))
                    .then(function(res) {
                      // that timeline is empty
                      if (res === 0)
                        database.delAsync(mkKey(['post', that.id, 'timelines']))
                    })
                })
            })
          }),
        // remove all comments
        that.getComments()
          .then(function(comments) {
            return Promise.map(comments, function(comment) {
              return comment.destroy()
            })
          }),
        // delete likes
        database.delAsync(mkKey(['post', that.id, 'likes'])),
        // delete post
        database.delAsync(mkKey(['post', that.id]))
      ])
        // delete orphaned keys
        .then(function() {
          database.scardAsync(mkKey(['post', that.id, 'timelines']))
            .then(function(res) {
              // post does not belong to any timelines
              if (res === 0)
                database.delAsync(mkKey(['post', that.id, 'timelines']))
            })
        })
        .then(function() { return database.delAsync(mkKey(['post', that.id, 'comments'])) })
        .then(function(res) { resolve(res) })
    })
  }

  Post.prototype.getCreatedBy = function() {
    return models.User.findById(this.userId)
  }

  Post.prototype.getLikes = function() {
    return Promise.resolve(function() {
      return []
    })
  }

  Post.prototype.getSubscribedTimelineIds = function() {
    var that = this
    var timelineIds

    return new Promise(function(resolve, reject) {
      FeedFactory.findById(that.userId)
        .then(function(feed) {
          return Promise.all([
            feed.getRiverOfNewsTimelineId(),
            feed.getPostsTimelineId(),
          ])
        })
        .then(function(newTimelineIds) {
          timelineIds = newTimelineIds
          return that.getTimelineIds()
        })
        .then(function(newTimelineIds) {
          timelineIds = timelineIds.concat(newTimelineIds)
          timelineIds = _.uniq(timelineIds)
          resolve(timelineIds)
        })
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
          return database.rpushAsync(mkKey(['post', that.id, 'comments']), commentId)
        })
        .then(function(res) { resolve(res) })
    })
  }

  Post.prototype.getCommentIds = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.lrangeAsync(mkKey(['post', that.id, 'comments']), 0, -1)
        .then(function(commentIds) {
          that.commentIds = commentIds
          resolve(commentIds)
        })
    })
  }

  Post.prototype.getComments = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getCommentIds()
        .then(function(commentIds) {
          return Promise.map(commentIds, function(commentId) {
            return models.Comment.findById(commentId)
          })
        })
        .then(function(comments) {
          that.comments = comments
          resolve(that.comments)
        })
    })
  }

  Post.prototype.getLikeIds = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.smembersAsync(mkKey(['post', that.id, 'likes']))
        .then(function(likeIds) {
          that.likeIds = likeIds
          resolve(likeIds)
        })
    })
  }

  Post.prototype.getLikes = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getLikeIds()
        .then(function(userIds) {
          return Promise.map(userIds, function(userId) {
            return models.User.findById(userId)
          })
        })
        .then(function(users) {
          that.likes = users
          resolve(that.likes)
        })
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

  Post.prototype.removeLike = function(userId) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getSubscribedTimelineIds()
        .then(function() { return database.sremAsync(mkKey(['post', that.id, 'likes']), userId) })
        .then(function(res) { resolve(res) })
    })
  }

  return Post
}
