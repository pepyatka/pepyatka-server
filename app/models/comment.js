"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require("util").inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , Post = models.Post
  , mkKey = require("../support/models").mkKey
  , pubSub = models.PubSub

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

  Comment.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid

      valid = this.body
        && this.body.length > 0
        && this.userId
        && this.userId.length > 0
        && this.postId
      && this.postId.length > 0

      valid ? resolve(valid) : reject(new Error("Invalid"))
    }.bind(this))
  }

  Comment.prototype.validateOnCreate = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      Promise.join(that.validate(),
                   that.validateUniquness(mkKey(['comment', that.id])),
                   function(valid, idIsUnique) {
                     resolve(that)
                   })
        .catch(function(e) { reject(e) })
      })
  }

  Comment.prototype.create = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.createdAt = new Date().getTime()
      that.updatedAt = new Date().getTime()
      that.id = uuid.v4()

      that.validateOnCreate()
        .then(function(comment) {
          return database.hmsetAsync(mkKey(['comment', comment.id]),
                                     { 'body': comment.body,
                                       'userId': comment.userId,
                                       'postId': comment.postId,
                                       'createdAt': comment.createdAt.toString(),
                                       'updatedAt': comment.updatedAt.toString(),
                                     })
        })
        .then(function(res) { return Post.findById(that.postId) })
        .then(function(post) { return post.addComment(that.id)})
        .then(function() { return models.Stats.findById(that.userId) })
        .then(function(stats) { return stats.addComment() })
        .then(function() { resolve(that) })
        .catch(function(e) { reject(e) })
    })
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
