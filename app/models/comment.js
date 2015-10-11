"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require("util").inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , Post = models.Post
  , User = models.User
  , mkKey = require("../support/models").mkKey
  , pubSub = models.PubSub
  , _ = require('lodash')

exports.addModel = function(database) {
  /**
   * @constructor
   * @extends AbstractModel
   */
  var Comment = function(params) {
    Comment.super_.call(this)

    this.id = params.id
    this.body = params.body
    this.userId = params.userId
    this.postId = params.postId
    if (parseInt(params.createdAt, 10))
      this.createdAt = params.createdAt
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = params.updatedAt
  }

  inherits(Comment, AbstractModel)

  Comment.className = Comment
  Comment.namespace = "comment"
  Comment.findById = Comment.super_.findById
  Comment.getById = Comment.super_.getById

  Object.defineProperty(Comment.prototype, 'body', {
    get: function() { return this.body_ },
    set: function(newValue) {
      newValue ? this.body_ = newValue.trim() : this.body_ = ''
    }
  })

  Comment.prototype.validate = async function() {
    var valid

    valid = this.body && this.body.length > 0
      && this.userId && this.userId.length > 0
      && this.postId && this.postId.length > 0

    if (!valid) {
      throw new Error("Invalid")
    }

    return this
  }

  Comment.prototype.validateOnCreate = async function() {
    await Promise.all([
      this.validate(),
      this.validateUniquness(mkKey(['comment', this.id]))
    ])
  }

  Comment.prototype.create = async function() {
    this.createdAt = new Date().getTime()
    this.updatedAt = new Date().getTime()
    this.id = uuid.v4()

    await this.validateOnCreate()

    let payload = {
      'body': this.body,
      'userId': this.userId,
      'postId': this.postId,
      'createdAt': this.createdAt.toString(),
      'updatedAt': this.updatedAt.toString()
    }

    await database.hmsetAsync(mkKey(['comment', this.id]), payload)

    let post = await Post.findById(this.postId)
    let timelines = await post.addComment(this)

    let stats = await models.Stats.findById(this.userId)
    await stats.addComment()

    return timelines
  }

  Comment.prototype.update = function(params) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.updatedAt = new Date().getTime()
      that.body = params.body

      that.validate()
        .then(function(comment) {
          return database.hmsetAsync(mkKey(['comment', that.id]),
                                     { 'body': that.body,
                                       'updatedAt': that.updatedAt.toString()
                                     })
        })
        .then(function() { return pubSub.updateComment(that.id) })
        .then(function() { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  Comment.prototype.getPost = function() {
    return models.Post.findById(this.postId)
  }

  Comment.prototype.destroy = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      pubSub.destroyComment(that.id)
        .then(function(res) { return database.delAsync(mkKey(['comment', that.id])) })
        .then(function(res) {
          return database.lremAsync(mkKey(['post', that.postId, 'comments']), 1, that.id)
        })

        // look for comment from this user in this post
        // if this is was the last one remove this post from user's comments timeline
        .then(function() { return Post.findById(that.postId) })
        .then(function(post) { return post.getComments() })
        .then(function(comments) {
          if (_.any(comments, 'userId', that.userId)) {
            return Promise.resolve(true);
          }

          return User.findById(that.userId)
            .then(function(user) { return user.getCommentsTimelineId() })
            .then(function(timelineId) {
                return Promise.all([
                  database.zremAsync(mkKey(['timeline', timelineId, 'posts']), that.postId),
                  database.sremAsync(mkKey(['post', that.postId, 'timelines']), timelineId)
                ]);
            })

        })
        .then(function() { return models.Stats.findById(that.userId) })
        .then(function(stats) { return stats.removeComment() })
        .then(function(res) { resolve(res) })
    })
  }

  Comment.prototype.getCreatedBy = function() {
    return models.FeedFactory.findById(this.userId)
  }

  return Comment
}
