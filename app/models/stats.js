var uuid = require('node-uuid')
  , fs = require('fs')
  , gm = require('gm')
  , path = require('path')
  , models = require('../models')
  , async = require('async')
  , redis = require('redis')
  , _ = require('underscore')

exports.addModel = function(db) {
  function Stats(params) {
    this.userId = params.userId
    this.posts = params.posts || 0
    this.comments = params.comments || 0
    this.likes = params.likes || 0
    this.discussions = params.discussions || 0
    this.subscribers = params.subscribers || 0
    this.subscriptions = params.subscriptions || 0
  }

  Stats.getAttributes = function() {
    return ['userId', 'posts', 'comments', 'likes', 'discussions', 'subscribers', 'subscriptions']
  },

  Stats.findByUserId = function(userId, callback) {
    db.hgetall('stats:' + userId, function(err, attrs) {
      if (attrs) {
        attrs.userId = userId

        callback(err, new Stats(attrs))
      } else {
        callback(err, null)
      }
    })
  }

  Stats.prototype = {
    validate: function(callback) {
      var that = this

      db.exists('user:' + that.userId, function(err, userExists) {
        callback(userExists == 1)
      })
    },

    update: function(callback) {
      var that = this
      db.hmset('stats:' + that.userId, {
        'posts': that.posts.toString(),
        'comments': that.comments.toString(),
        'likes' : that.likes.toString(),
        'discussions' : that.discussions.toString(),
        'subscribers' : that.subscribers.toString(),
        'subscriptions' : that.subscriptions.toString()
      }, function(err, res) {
        callback(err, that)
      })
    },

    create: function(callback) {
      var that = this
      this.validate(function(valid) {
        if(valid) {
          db.exists('stats:' + that.userId, function(err, res) {
            if (res == 0) {
              db.hmset('stats:' + that.userId,
                {
                  'posts' : that.posts.toString(),
                  'comments' : that.comments.toString(),
                  'likes' : that.likes.toString(),
                  'discussions' : that.discussions.toString(),
                  'subscribers' : that.subscribers.toString(),
                  'subscriptions' : that.subscriptions.toString()
                }, function(err, res) {
                  callback(null, that)
                })
            } else {
              callback(err, res)
            }
          })
        } else {
          callback(1, that)
        }
      })
    },

    addPost: function(callback) {
      var that = this
      that.posts++
      that.update(function(err, stats) {
        callback(err, stats)
      })
    },

    removePost: function(callback) {
      var that = this
      that.posts--
      that.update(function(err, stats) {
        callback(err, stats)
      })
    },

    addComment: function(callback) {
      var that = this
      that.comments++
      that.update(function(err, stats) {
        callback(err, stats)
      })
    },

    removeComment: function(callback) {
      var that = this
      that.comments--
      that.update(function(err, stats) {
        callback(err, stats)
      })
    },

    addLike: function(callback) {
      var that = this
      that.likes++
      that.update(function(err, stats) {
        callback(err, stats)
      })
    },

    removeLike: function(callback) {
      var that = this
      that.likes--
      that.update(function(err, stats) {
        callback(err, stats)
      })
    },

    addDiscussion: function(callback) {
      var that = this
      that.discussions++
      that.update(function(err, stats) {
        callback(err, stats)
      })
    }
  }

  return Stats
}
