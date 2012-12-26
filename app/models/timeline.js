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
    db.zrevrange('timeline:' + user_id, 0, POSTS, function(err, posts) {
      var len = posts.length;
      var done = 0;
      var i = 0;

      // Never do this at home. I'm going to modify the iterator in
      // its body
      if (len > 0) {      
        _.each(posts, function(post_id) {
          models.Post.find(post_id, function(num) {
            return function(post) {
              posts[num] = post
              
              // TODO: -> _.after method
              done += 1;
              
              // This is the last element in the list - we can run callback
              if (done >= len) 
                return callback(posts)
            }
          }(i))

          i += 1
        });
      } else {
        return callback([])
      }
    })
  }

  Timeline.prototype = {
  }
  
  return Timeline;
}
