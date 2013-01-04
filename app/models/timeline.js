var _ = require('underscore')
  , models = require('../models')
  , async = require('async')
  , redis = require('redis')

exports.add_model = function(db) {
  var POSTS = 10

  // User may have one or more timelines. Each timeline is a sorted
  // set. User must has one required timeline which is river of news.
  function Timeline(params, callback) {
    console.log('new Timeline(' + params + ')')
    var that = this;
    this.user_id = params.user_id

    db.zrevrange('timeline:' + this.user_id, 0, POSTS, function(err, posts) {
      that.posts = posts
      callback(that)
    })
  }

  Timeline.find = function(user_id, callback) {
    console.log('Timeline.find("' + user_id + '")')
    var timeline = new Timeline({ user_id: user_id }, function() {
      callback(timeline)
    })
  }

  Timeline.update = function(user_id, callback) {
    console.log('Timeline.update("' + user_id + '")')
    db.zrevrange('timeline:' + user_id, POSTS, -1, function(err, posts) {
      async.forEach(posts, function(post_id, callback) {
        models.Post.destroy(post_id, function(err, res) {
          pub = redis.createClient();
          pub.publish('destroyPost', post_id)
          
          callback(err)
        })
      }, function(err) {
        callback()
      })
    })
  }

  Timeline.updatePost = function(user_id, post_id, callback) {
    console.log('Timeline.updatePost("' + user_id + '", "' + post_id + '")')
    var current_time = new Date().getTime()
    db.zadd('timeline:' + user_id, current_time, post_id, function(err, res) {
      db.hset('post:' + post_id, 'updated_at', current_time, function(err, res) {
        callback()
      })
    })
  }

  Timeline.newPost = function(user_id, post_id, callback) {
    console.log('Timeline.newPost("' + user_id + '", "' + post_id + '")')
    var current_time = new Date().getTime()
    db.zadd('timeline:' + user_id, current_time, post_id, function(err, res) {
      Timeline.update(user_id, function() {
        // TODO: -> Post.update()
        db.hset('post:' + post_id, 'updated_at', current_time, function(err, res) {
          callback()
        })
      })
    })
  }

  Timeline.posts = function(user_id, callback) {
    console.log('Timeline.posts("' + user_id + '")')
    db.zrevrange('timeline:' + user_id, 0, POSTS-1, function(err, posts) {
      async.mapSeries(posts, function(post_id, callback) {
        models.Post.find(post_id, function(post) {
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

      async.mapSeries(this.posts, function(post_id, callback) {
        models.Post.find(post_id, function(post) {
          post.toJSON(function(json) {
            callback(null, json)
          })
        })
      }, function(err, postsJSON) {
        models.User.find(that.user_id, function(user) {
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
