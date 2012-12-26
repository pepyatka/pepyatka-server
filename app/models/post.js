var uuid = require('node-uuid')
  , models = require('../models');

exports.add_model = function(db) {
  function Post(params) {
    this.body = params.body
    this.id = params.id
    this.user_id = params.user_id
  }

  Post.find = function(post_id, callback) {
    db.hgetall('post:' + post_id, function(err, attrs) {
      attrs.id = post_id
      return callback(new Post(attrs))
    })
  }

  Post.bumpable = function(post_id, callback) {
    return callback(true);
  }

  Post.addComment = function(post_id, comment_id, callback) {
    db.hget('post:' + post_id, 'user_id', function(err, user_id) {
      db.lpush('post:' + post_id + ':comments', comment_id, function() {
        // Can we bump this post
        Post.bumpable(post_id, function(bump) {
          if (bump) {
            models.Timeline.newPost(user_id, post_id, function() {
              return callback();
            })
          } else {
            return callback();
          }
        })
      })
    })
  }

  Post.prototype = {
    save: function(callback) {
      var that = this
      this.created_at = new Date().getTime()
      if (this.id === undefined) this.id = uuid.v4()

      db.multi()
        .hset('post:' + this.id, 'body', this.body)
        .hset('post:' + this.id, 'created_at', this.created_at)
        .hset('post:' + this.id, 'user_id', this.user_id)
        .exec(function(err, res) {
          models.Timeline.newPost(that.user_id, that.id, function() {
            return callback()
          })
        })
    }
  }
  
  return Post;
}
