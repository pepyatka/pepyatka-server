var models = require('../models')
  , async = require('async')
  , redis = require('redis')
  , logger = require('../../logger').create()

exports.addModel = function(db) {
  var POSTS = 25

  // TODO: User may have one or more timelines. Each timeline is a
  // sorted set. User must has two required timelines:
  // - river of news - home page
  // - direct messages
  // all other timelines are optional
  function Timeline(params, callback) {
    logger.debug('new Timeline(' + params + ')')
    var that = this;
    this.userId = params.userId

    db.zrevrange('timeline:' + this.userId, 0, POSTS-1, function(err, posts) {
      that.posts = posts
      callback(that)
    })
  }

  Timeline.find = function(userId, callback) {
    logger.debug('Timeline.find("' + userId + '")')
    var timeline = new Timeline({ userId: userId }, function() {
      callback(timeline)
    })
  }

  // If user updates timeline we need to
  Timeline.update = function(userId, callback) {
    logger.debug('Timeline.update("' + userId + '")')
    db.zrevrange('timeline:' + userId, POSTS, -1, function(err, posts) {
      async.forEach(posts, function(postId, callback) {
        models.Post.destroy(postId, function(err, res) {        
          callback(err)
        })
      }, function(err) {
        callback()
      })
    })
  }

  Timeline.updatePost = function(userId, postId, callback) {
    logger.debug('Timeline.updatePost("' + userId + '", "' + postId + '")')
    var currentTime = new Date().getTime()
    db.zadd('timeline:' + userId, currentTime, postId, function(err, res) {
      db.hset('post:' + postId, 'updatedAt', currentTime, function(err, res) {
        callback()
      })
    })
  }

  Timeline.newPost = function(userId, postId, callback) {
    logger.debug('Timeline.newPost("' + userId + '", "' + postId + '")')
    var currentTime = new Date().getTime()
    db.zadd('timeline:' + userId, currentTime, postId, function(err, res) {
      Timeline.update(userId, function() {
        // TODO: -> Post.update() ?
        db.hset('post:' + postId, 'updatedAt', currentTime, function(err, res) {
          callback()
        })
      })
    })
  }

  Timeline.posts = function(userId, callback) {
    logger.debug('Timeline.posts("' + userId + '")')
    db.zrevrange('timeline:' + userId, 0, POSTS-1, function(err, posts) {
      async.map(posts, function(postId, callback) {
        models.Post.find(postId, function(post) {
          callback(null, post)
        })
      }, function(err, posts) {
        callback(posts)
      })
    })
  }

  Timeline.prototype = {
    toJSON: function(callback) {
      logger.debug("- timeline.toJSON()")
      var that = this;

      async.map(this.posts, function(postId, callback) {
        models.Post.find(postId, function(post) {
          post.toJSON(function(json) {
            callback(null, json)
          })
        })
      }, function(err, postsJSON) {
        models.User.findById(that.userId, function(user) {
          user.toJSON(function(user) {
            callback({ 
              user: user,
              posts: postsJSON
            })
          })
        })
      })
    }
  }
  
  return Timeline;
}
