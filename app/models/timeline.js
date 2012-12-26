var _ = require('underscore')

exports.add_model = function(db) {
  POSTS = 10

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
          .del('post:' + post_id)
          .exec(function(err, res) { })
      });

      callback()
    })
  }

  Timeline.post = function(user_id, post_id, callback) {
    db.zadd('timeline:' + user_id, new Date().getTime(), post_id, function(err, res) {
      Timeline.update(user_id, function() {
        callback()
      })
    })
  }

  Timeline.prototype = {
  }
  
  return Timeline;
}
