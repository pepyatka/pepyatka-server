"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require("util").inherits
  , AbstractModel = require('../models').AbstractModel

exports.addModel = function(database) {
  var Post = function(params) {
    Post.super_.call(this)

    this.id = params.id
    this.body = params.body
    if (parseInt(params.createdAt, 10))
      this.createdAt = params.createdAt
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = params.updatedAt
  }

  inherits(Post, AbstractModel)

  Post.className = Post
  Post.namespace = "post"
  Post.findById = Post.super_.findById

  Post.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid

      valid = this.body.length > 0

      valid ? resolve(valid) : reject(new Error("Invalid"))
    }.bind(this))
  }

  Post.prototype.validateOnCreate = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      Promise.join(that.validate(),
                   that.validateUniquness('post:' + that.id),
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
          database.hmsetAsync('post:' + post.id,
                              { 'body': post.body.trim(),
                                'createdAt': post.createdAt.toString(),
                                'updatedAt': post.updatedAt.toString(),
                              })
        })
        .then(function(res) { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  Post.prototype.update = function(params) {
  }

  return Post
}
