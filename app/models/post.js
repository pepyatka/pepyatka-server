var uuid = require('node-uuid')
  , models = require('../models')
  , _ = require('underscore')

exports.add_model = function(db) {
  function Post(params) {
    console.log('new Post(' + params + ')')
    this.body = params.body

    // params to filter
    this.id = params.id
    this.created_at = parseInt(params.created_at) || null
    this.updated_at = parseInt(params.updated_at) || null
    
    this.comments = params.comments || []

    this.user_id = params.user_id
    this.user = params.user
  }

  Post.find = function(post_id, callback) {
    console.log('Post.find("' + post_id + '")')
    db.hgetall('post:' + post_id, function(err, attrs) {
      // TODO: check if we find a post
      attrs.id = post_id
      var post = new Post(attrs)

      var addAttributes = function(comments) {
        // TODO: switch comments and user selects
        post.comments = comments
        models.User.find(attrs.user_id, function(user) {
          post.user = user
          return callback(post)
        })
      }

      post.getLastComments(addAttributes)
    })
  }

  Post.destroy = function(post_id, callback) {
    console.log('Post.destroy("' + post_id + '")')
    db.hget('post:' + post_id, 'user_id', function(err, user_id) {
      db.multi()
        .zrem('timeline:' + user_id, post_id)
        .del('post:' + post_id)
        .del('post:' + post_id + ':comments')
        .exec(function(err, res) { 
          callback(res)
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
    // Return all comments
    getComments: function(callback) {
      console.log('- post.getComments()')
      var that = this
      db.lrange('post:' + this.id + ':comments', 0, -1, function(err, comments) {
        var new_comments = []
        comments.forEachAsync(
          function(comment_id, next) { 
            return models.Comment.find(comment_id, function(item) { return next(item) })
          },
          function(num, comment) {
            new_comments[num] = comment;
          },
          function() {
            return callback(new_comments)
          }
        )
      })
    },

    // Get first three comments if they exist or return first and last
    // comments instead
    getLastComments: function(callback) {
      console.log('- post.getLastComments()')
      var that = this
      var commentsRecord = 'post:' + this.id + ':comments'
      db.llen(commentsRecord, function(err, len) {
        if (len < 0) { // If there are more than 3 comments filter them
          db.lindex(commentsRecord, 0, function(err, firstComment) {
            db.lindex(commentsRecord, -1, function(err, lastComment) {
              var comments = [firstComment, lastComment]
              return callback(comments)
            })
          })
        } else {
          that.getComments(function(comments) { 
            return callback(comments)
          })
        }
      })
    },

    save: function(callback) {
      console.log('- post.save()')
      var that = this
      this.created_at = new Date().getTime()
      this.updated_at = new Date().getTime()
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
    },

    toJSON: function(callback) {
      console.log('- post.toJSON()')
      var that = this;
      this.getComments(function(comments) {
        models.User.find(that.user_id, function(user) {
          commentsJSON = []
          comments.forEachAsync(
            function(comment, next) { 
              return models.Comment.find(comment.id, function(comment) {
                comment.toJSON(function(item) {
                  return next(item) 
                })
              })
            },
            function(num, comment) {
              commentsJSON[num] = comment;
            },
            function() {
              user.toJSON(function(user) {
                return callback({ 
                  id: that.id,
                  createdAt: that.created_at,
                  updatedAt: that.updated_at,
                  body: that.body,
                  createdBy: user,
                  comments: commentsJSON
                })
              })
            }
          )
        })
      })
    }

  }
  
  return Post;
}
