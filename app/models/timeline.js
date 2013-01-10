var models = require('../models')
  , async = require('async')
  , redis = require('redis')

exports.addModel = function(db) {
  var POSTS = 1

  // User may have one or more timelines. Each timeline is a sorted
  // set. User must has one required timeline which is river of news.
  function Timeline(params, callback) {
    console.log('new Timeline(' + params + ')')
    var that = this;
    this.userId = params.userId

    db.zrevrange('timeline:' + this.userId, 0, POSTS-1, function(err, posts) {
      that.posts = posts
      callback(that)
    })
  }

  Timeline.find = function(userId, callback) {
    console.log('Timeline.find("' + userId + '")')
    var timeline = new Timeline({ userId: userId }, function() {
      callback(timeline)
    })
  }

  Timeline.update = function(userId, callback) {
    console.log('Timeline.update("' + userId + '")')
    db.zrevrange('timeline:' + userId, POSTS, -1, function(err, posts) {
      async.forEach(posts, function(postId, callback) {
        models.Post.destroy(postId, function(err, res) {
          pub = redis.createClient();
          pub.publish('destroyPost', postId)
          
          callback(err)
        })
      }, function(err) {
        callback()
      })
    })
  }

  Timeline.updatePost = function(userId, postId, callback) {
    console.log('Timeline.updatePost("' + userId + '", "' + postId + '")')
    var currentTime = new Date().getTime()
    db.zadd('timeline:' + userId, currentTime, postId, function(err, res) {
      db.hset('post:' + postId, 'updatedAt', currentTime, function(err, res) {
        callback()
      })
    })
  }

  Timeline.newPost = function(userId, postId, callback) {
    console.log('Timeline.newPost("' + userId + '", "' + postId + '")')
    var currentTime = new Date().getTime()
    db.zadd('timeline:' + userId, currentTime, postId, function(err, res) {
      Timeline.update(userId, function() {
        // TODO: -> Post.update()
        db.hset('post:' + postId, 'updatedAt', currentTime, function(err, res) {
          callback()
        })
      })
    })
  }

  Timeline.posts = function(userId, callback) {
    console.log('Timeline.posts("' + userId + '")')
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
      console.log("- timeline.toJSON()")
      var that = this;

      // TODO: async.parallel([], function() { ... })
      async.map(this.posts, function(postId, callback) {
        models.Post.find(postId, function(post) {
          post.toJSON(function(json) {
            callback(null, json)
          })
        })
      }, function(err, postsJSON) {
        models.User.find(that.userId, function(user) {
          user.toJSON(function(user) {
            return callback({ 
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
