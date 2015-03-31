"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require('util').inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , Post = models.Post
  , mkKey = require('../support/models').mkKey

exports.addModel = function(database) {
  var Attachment = function(params) {
    Attachment.super_.call(this)

    this.id = params.id
    this.filename = params.filename
    this.isImage = params.isImage
    this.userId = params.userId
    this.postId = params.postId
    if (parseInt(params.createdAt, 10))
      this.createdAt = params.createdAt
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = params.updatedAt
  }

  inherits(Attachment, AbstractModel)

  Attachment.className = Attachment
  Attachment.namespace = 'attachment'
  Attachment.findById = Attachment.super_.findById

  Attachment.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid

      valid = this.filename
        && this.filename.length > 0
        && this.userId
        && this.userId.length > 0
        && this.postId
        && this.postId.length > 0

      valid ? resolve(valid) : reject(new Error('Invalid'))
    }.bind(this))
  }

  Attachment.prototype.validateOnCreate = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      Promise.join(that.validate(),
                   that.validateUniquness(mkKey(['attachment', that.id])),
                   function(valid, idIsUnique) {
                     resolve(that)
                   })
        .catch(function(e) { reject(e) })
      })
  }

  Attachment.prototype.create = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.createdAt = new Date().getTime()
      that.updatedAt = new Date().getTime()
      that.id = uuid.v4()

      that.validateOnCreate()
        .then(function(attachment) {
          return database.hmsetAsync(mkKey(['attachment', attachment.id]),
                                     { 'filename': attachment.filename,
                                       'isImage': attachment.isImage,
                                       'userId': attachment.userId,
                                       'postId': attachment.postId,
                                       'createdAt': attachment.createdAt.toString(),
                                       'updatedAt': attachment.updatedAt.toString()
                                     })
        })
        .then(function(res) { return Post.findById(that.postId) })
        .then(function(post) { return post.addAttachment(that.id)})
        .then(function(res) { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  Attachment.prototype.destroy = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.delAsync(mkKey(['attachment:', that.id]))
        .then(function(res) {
          return Promise.all([
            database.publishAsync('destroyAttachment',
                                  JSON.stringify({
                                    postId: that.postId,
                                    attachmentId: that.id
                                  })),
            database.delAsync(mkKey(['attachment', that.id])),
            database.lremAsync(mkKey(['post', that.postId, 'attachments']), 1, that.id)
          ])
        })
        .then(function(res) { resolve(res) })
    })
  }

  return Attachment
}
