var uuid = require('node-uuid')
  , models = require('../models')
  , _ = require('underscore')

exports.add_model = function(db) {
  function Post(params) {
    this.body = params.body

    // params to filter
    this.id = params.id
    this.user_id = params.user_id
    this.created_at = parseInt(params.created_at)
  }

  Post.find = function(post_id, callback) {
    db.hgetall('post:' + post_id, function(err, attrs) {
      attrs.id = post_id
      var post = new Post(attrs)
      post.getComments(function(comments) {
        post.comments = comments

        models.User.find(attrs.user_id, function(user) {
          post.user = user
          return callback(post)
        })
      })
    })
  }

  Post.bumpable = function(post_id, callback) {
    return callback(true);
  }

  Post.addComment = function(post_id, comment_id, callback) {
    db.hget('post:' + post_id, 'user_id', function(err, user_id) {
      db.rpush('post:' + post_id + ':comments', comment_id, function() {
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
    getComments: function(callback) {
      var that = this
      db.lrange('post:' + this.id + ':comments', 0, -1, function(err, comments) {
        var len = comments.length;
        var done = 0;
        var i = 0;

        if (len > 0) {
          // Never do this at home. I'm going to modify the iterator in
          // its body
          _.each(comments, function(comment_id) {
            models.Comment.find(comment_id, function(num) {
              return function(comment) {
                comments[num] = comment
                
                done += 1;
                
                // This is the last element in the list - we can run callback
                if (done >= len) 
                  return callback(comments)
              }
            }(i))

            i += 1
          });
        } else {
          return callback([])
        }
      })
    },

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
