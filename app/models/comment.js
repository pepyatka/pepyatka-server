"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require("util").inherits
  , AbstractModel = require('../models').AbstractModel
  , mkKey = require("../support/models").mkKey

exports.addModel = function(database) {
  var Comment = function(params) {
    Comment.super_.call(this)

    this.id = params.id
    this.body = params.body
    if (parseInt(params.createdAt, 10))
      this.createdAt = params.createdAt
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = params.updatedAt
  }

  inherits(Comment, AbstractModel)

  Comment.className = Comment
  Comment.namespace = "comment"
  Comment.findById = Comment.super_.findById

  Object.defineProperty(Comment.prototype, 'body', {
    get: function() { return this.body_ },
    set: function(newValue) {
      newValue ? this.body_ = newValue.trim() : this.body_ = ''
    }
  })

  Comment.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid

      valid = this.body.length > 0

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
          database.hmsetAsync(mkKey(['comment', comment.id]),
                              { 'body': comment.body,
                                'createdAt': comment.createdAt.toString(),
                                'updatedAt': comment.updatedAt.toString(),
                              })
        })
        .then(function(res) { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  Comment.prototype.update = function(params) {
  }

  return Comment
}
