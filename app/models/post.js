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

      valid = this.body.length > 0
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

  return Post
}
