var _ = require('underscore')
  , models = require('../models')

exports.add_model = function(db) {
  var POSTS = 10

  function Timeline(params) {
  }

  // Timeline.find = function(user_id, callback) {
  //   db.zrevrange('timeline:' + user_id, 0, -1, function(err, posts) {
  //     return callback(posts)
  //   })
  // }

  Timeline.update = function(user_id, callback) {
    db.zrevrange('timeline:' + user_id, POSTS, -1, function(err, posts) {
      posts.forEachAsync(
        function(post_id, next) { 
          models.Post.destroy(post_id, function(err, res) { return next() }) 
        }, 
        function(num, post_id) { },
        function() {
          return callback() 
        })
    })
  }

  Timeline.newPost = function(user_id, post_id, callback) {
    db.zadd('timeline:' + user_id, new Date().getTime(), post_id, function(err, res) {
      Timeline.update(user_id, function() {
        callback()
      })
    })
  }

  Timeline.posts = function(user_id, callback) {
    db.zrevrange('timeline:' + user_id, 0, POSTS-1, function(err, posts) {
      var new_posts = []

      posts.forEachAsync(
        function(post_id, next) {
          models.Post.find(post_id, function(item) { return next(item) }) 
        }, 
        function(num, post) { new_posts[num] = post; },
        function() {
          return callback(new_posts) 
        })
    })
  }

  Timeline.prototype = {
  }
  
  return Timeline;
}
