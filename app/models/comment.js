var uuid = require('node-uuid')
  , models = require('../models')

exports.addModel = function(db) {
  function Comment(params) {
    this.id = params.id
    this.body = params.body
    this.postId = params.postId
    this.userId = params.userId

    if (parseInt(params.createdAt))
      this.createdAt = parseInt(params.createdAt)
    if (parseInt(params.updatedAt))
      this.updatedAt = parseInt(params.updatedAt)
  }

  Comment.findById = function(commentId, callback) {
    db.hgetall('comment:' + commentId, function(err, attrs) {
      // TODO: check if we find a comment
      attrs.id = commentId
      var comment = new Comment(attrs)
      models.User.findById(attrs.userId, function(user) {
        comment.user = user
        callback(comment)
      })
    })
  }

  // TODO: commentId -> commentsId
  Comment.destroy = function(commentId, callback) {
    db.del('comment:' + commentId, function(err, res) {
      callback(err, res)
    })
  }

  Comment.prototype = {
    save: function(callback) {
      var that = this
      // User is allowed to create a comment if and only if its
      // post is created and exists.
      db.exists('post:' + this.postId, function(err, res) {
        // post exists
        if (res == 1) { 
          that.createdAt = new Date().getTime()
          if (that.id === undefined) that.id = uuid.v4()

          db.hmset('comment:' + that.id, 
                   { 'body': (that.body || "").toString().trim(),
                     'createdAt': that.createdAt.toString(),
                     'userId': that.userId.toString(),
                     'postId': that.postId.toString()
                   }, function(err, res) {
                     models.Post.addComment(that.postId, that.id, function() {
                       callback(that)
                     })
                   })
        } else {
          // TODO: pass res=0 argument to the next block
          callback()
        }
      })
    },

    toJSON: function(callback) {
      var that = this;
      models.User.findById(this.userId, function(user) {
        user.toJSON(function(user) {
          callback({
            id: that.id,
            body: that.body,
            postId: that.postId,
            createdBy: user,
            createdAt: that.createdAt
          })
        })
      }
    )}

  }
  
  return Comment;
}
