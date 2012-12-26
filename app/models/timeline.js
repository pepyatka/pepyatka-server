var _ = require('underscore')
  , models = require('../models')

exports.add_model = function(db) {
  var POSTS = 10

  function Timeline(params) {
  }

  Timeline.find = function(user_id, callback) {
    db.zrevrange('timeline:' + this.id, 0, -1, function(err, posts) {
      return callback(posts)
    })
  }

  Timeline.update = function(user_id, callback) {
    db.zrevrange('timeline:' + user_id, POSTS, -1, function(err, posts) {
      _.each(posts, function(post_id) {
        db.multi()
          .zrem('timeline:' + user_id, post_id)
          // TODO: -> Post.delete(post_id)
          .del('post:' + post_id)
          .exec(function(err, res) { })
      });

      callback()
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
    db.zrevrange('timeline:' + user_id, 0, POSTS, function(err, posts_ids) {
      var posts = []
      var len = posts_ids.length;
      var i = 0;

      if (len > 0) {
        _.each(posts_ids, function(post_id) {
          models.Post.find(post_id, function(post) {
            posts.push(post)
            
            i += 1;

            // This is the last element in the list - we can run callback
            if (i >= len) 
              callback(posts)
          })
        });
      } else {
        callback(posts)
      }
    })
  }

  Timeline.prototype = {
  }
  
  return Timeline;
}
