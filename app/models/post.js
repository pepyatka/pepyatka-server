var uuid = require('node-uuid')
  , models = require('../models')
  , _ = require('underscore')
  , async = require('async')

exports.add_model = function(db) {
  function Post(params) {
    console.log('new Post(' + params + ')')
    this.body = params.body

    // params to filter
    this.id = params.id
    this.created_at = parseInt(params.created_at) || null
    this.updated_at = parseInt(params.updated_at) || null

    // TODO: it needs to be an array not just a single value
    this.imageId = params.imageId || null
    
    this.comments = params.comments || []

    // if post has more than X comments, but json returns only a part
    // of them. Would be nice to merge with comments structure.

    this.partial = false 
    this.commentsLength = null


    this.user_id = params.user_id
    this.user = params.user
  }

  Post.find = function(post_id, callback) {
    console.log('Post.find("' + post_id + '")')
    db.hgetall('post:' + post_id, function(err, attrs) {
      // TODO: check if we find a post
      attrs.id = post_id
      var post = new Post(attrs)

      post.getLastComments(function(comments) {
        // TODO: switch comments and user selects
        post.comments = comments
        models.User.find(attrs.user_id, function(user) {
          post.user = user
          return callback(post)
        })
      })
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
          callback(err, res)
        })
    })
  }

  Post.bumpable = function(post_id, callback) {
    return callback(true);
  }

  Post.addComment = function(post_id, comment_id, callback) {
    console.log('Post.addComment("' + post_id + '", "' + comment_id + '")')
    db.hget('post:' + post_id, 'user_id', function(err, user_id) {
      db.rpush('post:' + post_id + ':comments', comment_id, function() {
        // Can we bump this post
        Post.bumpable(post_id, function(bump) {
          if (bump) {
            models.Timeline.updatePost(user_id, post_id, function() {
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
        async.map(comments, function(comment_id, callback) {
          models.Comment.find(comment_id, function(comment) {
            callback(null, comment)
          })
        }, function(err, comments) {
          callback(comments)
        })
      })
    },

    // Get first three comments if they exist or return first and last
    // comments instead
    getLastComments: function(callback) {
      console.log('- post.getLastComments()')
      var that = this
      var commentsRecord = 'post:' + this.id + ':comments'
      db.llen(commentsRecord, function(err, len) {
        if (len > 3) { // If there are more than 3 comments filter them
          // or we can just insert dummy comments like '...'
          db.lindex(commentsRecord, 0, function(err, firstComment) {
            db.lindex(commentsRecord, -1, function(err, lastComment) {
              var comments = [firstComment, lastComment]
              that.partial = true
              that.commentsLength = len
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
        .hset('post:' + this.id, 'imageId', this.imageId)
        .exec(function(err, res) {
          models.Timeline.newPost(that.user_id, that.id, function() {
            return callback(that)
          })
        })
    },

    toJSON: function(callback) {
      console.log('- post.toJSON()')
      var that = this;
      this.getComments(function(comments) {
        models.User.find(that.user_id, function(user) {
          async.map(comments, function(comment, callback) {
            comment.toJSON(function(json) {
              return callback(null, json)
            })
          }, function(err, commentsJSON) {
            user.toJSON(function(user) {
              return callback({ 
                id: that.id,
                createdAt: that.created_at,
                updatedAt: that.updated_at,
                body: that.body,
                createdBy: user,
                comments: commentsJSON,
                // TODO: if partial is false do not send commentsLength attribute
                partial: that.partial, 
                commentsLength: that.commentsLength,
                imageId: that.imageId
              })
            })
          })
        })
      })
    }

  }
  
  return Post;
}
