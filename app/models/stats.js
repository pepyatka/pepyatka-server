"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require("util").inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , mkKey = require("../support/models").mkKey

exports.addModel = function(database) {
  var Stats = function(params) {
    Stats.super_.call(this)

    this.id = params.id
    this.posts = params.posts || 0
    this.likes = params.likes || 0
    this.comments = params.comments || 0
    this.subscribers = params.subscribers || 0
    this.subscriptions = params.subscriptions || 0
  }

  inherits(Stats, AbstractModel)

  Stats.className = Stats
  Stats.namespace = "stats"
  Stats.findById = Stats.super_.findById

  Stats.prototype.validateOnCreate = function() {
    return new Promise(function(resolve, reject) {
      var valid = this.id
          && this.id.length > 0

      database.existsAsync(mkKey(['user', this.id]))
        .then(function(status) {
          valid && status == 1 ? resolve(true) : reject(new Error("Invalid"))
        })
    }.bind(this))
  }

  Stats.prototype.create = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.validateOnCreate()
        .then(function() {
          return Promise.all([
            database.hmsetAsync(mkKey(['stats', that.id]), {
              'posts' : that.posts.toString(),
              'likes' : that.likes.toString(),
              'comments' : that.comments.toString(),
              'subscribers' : that.subscribers.toString(),
              'subscriptions' : that.subscriptions.toString()
            }),
            database.zaddAsync(mkKey(['stats', 'likes']), that.likes, that.id),
            database.zaddAsync(mkKey(['stats', 'posts']), that.posts, that.id),
            database.zaddAsync(mkKey(['stats', 'comments']), that.comments, that.id),
            database.zaddAsync(mkKey(['stats', 'subscribers']), that.subscribers, that.id),
            database.zaddAsync(mkKey(['stats', 'subscriptions']), that.subscriptions, that.id)
          ])
        })
        .then(function(res) { resolve(res) })
    })
  }

  Stats.prototype.changeProperty = function(property, value) {
    var that = this
    return new Promise(function(resolve, reject) {
      database.hincrbyAsync('stats:' + that.id, property, value)
        .then(function() { resolve(database.zincrbyAsync(mkKey(['stats', property]),
                                                       value,
                                                       that.id)) })
    })
  }

  Stats.prototype.incrementProperty = function(property) {
    return this.changeProperty(property, 1)
  }

  Stats.prototype.decrementProperty = function(property) {
    return this.changeProperty(property, -1)
  }

  Stats.prototype.addPost = function() {
    return this.incrementProperty('posts')
  }

  Stats.prototype.removePost = function() {
    return this.decrementProperty('posts')
  }

  Stats.prototype.addLike = function() {
    return this.incrementProperty('likes')
  }

  Stats.prototype.removeLike = function() {
    return this.decrementProperty('likes')
  }

  Stats.prototype.addComment = function() {
    return this.incrementProperty('comments')
  }

  Stats.prototype.removeComment = function() {
    return this.decrementProperty('comments')
  }

  Stats.prototype.addSubscriber = function() {
    return this.incrementProperty('subscribers')
  }

  Stats.prototype.removeSubscriber = function() {
    return this.decrementProperty('subscribers')
  }

  Stats.prototype.addSubscription = function() {
    return this.incrementProperty('subscriptions')
  }

  Stats.prototype.removeSubscription = function() {
    return this.decrementProperty('subscriptions')
  }

  return Stats
}
