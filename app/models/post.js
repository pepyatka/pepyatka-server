var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')

exports.addModel = function(db) {
  function Post(params) {
    console.log('new Post(' + params + ')')
    this.body = params.body

    // params to filter
    this.id = params.id
    this.createdAt = parseInt(params.createdAt) || null
    this.updatedAt = parseInt(params.updatedAt) || null

    // TODO: it needs to be an array not just a single value
    this.imageId = params.imageId
    
    this.comments = params.comments || []

    // if post has more than X comments, but json returns only a part
    // of them. Would be nice to merge with comments structure.

    this.partial = false 
    this.commentsLength = null

    this.userId = params.userId
    this.user = params.user
  }

  Post.find = function(postId, callback) {
    console.log('Post.find("' + postId + '")')
    db.hgetall('post:' + postId, function(err, attrs) {
      // TODO: check if we find a post
      attrs.id = postId
      var post = new Post(attrs)

      post.getLastComments(function(comments) {
        // TODO: switch comments and user selects
        post.comments = comments
        models.User.find(attrs.userId, function(user) {
          post.user = user
          return callback(post)
        })
      })
    })
  }

  Post.destroy = function(postId, callback) {
    console.log('Post.destroy("' + postId + '")')
    db.hget('post:' + postId, 'userId', function(err, userId) {
      // TODO: async lib
      db.multi()
        .zrem('timeline:' + userId, postId)
        .del('post:' + postId)
        .del('post:' + postId + ':comments')
        .exec(function(err, res) { 
          callback(err, res)
        })
    })
  }

  Post.bumpable = function(postId, callback) {
    return callback(true);
  }

  Post.addComment = function(postId, commentId, callback) {
    console.log('Post.addComment("' + postId + '", "' + commentId + '")')
    db.hget('post:' + postId, 'userId', function(err, userId) {
      db.rpush('post:' + postId + ':comments', commentId, function() {
        // Can we bump this post
        Post.bumpable(postId, function(bump) {
          if (bump) {
            models.Timeline.updatePost(userId, postId, function() {
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
        async.map(comments, function(commentId, callback) {
          models.Comment.find(commentId, function(comment) {
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
      this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      if (this.id === undefined) this.id = uuid.v4()

      db.multi()
        .hset('post:' + this.id, 'body', this.body)
        .hset('post:' + this.id, 'createdAt', this.createdAt)
        .hset('post:' + this.id, 'userId', this.userId)
        // TODO: save if and only if imageId is not null
        .hset('post:' + this.id, 'imageId', this.imageId) 
        .exec(function(err, res) {
          models.Timeline.newPost(that.userId, that.id, function() {
            return callback(that)
          })
        })
    },

    toJSON: function(callback) {
      console.log('- post.toJSON()')
      var that = this;
      this.getComments(function(comments) {
        models.User.find(that.userId, function(user) {
          async.map(comments, function(comment, callback) {
            comment.toJSON(function(json) {
              return callback(null, json)
            })
          }, function(err, commentsJSON) {
            user.toJSON(function(user) {
              return callback({ 
                id: that.id,
                createdAt: that.createdAt,
                updatedAt: that.updatedAt,
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
