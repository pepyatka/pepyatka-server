var uuid = require('node-uuid')
  , models = require('../models');

exports.addModel = function(db) {
  function Comment(params) {
    console.log('new Comment(' + JSON.stringify(params) + ')')
    this.body = params.body
    this.postId = params.postId

    this.createdAt = parseInt(params.createdAt) ||  null

    // TODO: not implemented yet
    this.updatedAt = parseInt(params.updatedAt) ||  null

    // params to filter
    this.id = params.id

    this.userId = params.userId
    this.user = params.user
  }

  Comment.find = function(commentId, callback) {
    console.log('Comment.find("' + commentId + '")')
    db.hgetall('comment:' + commentId, function(err, attrs) {
      // TODO: check if we find a comment
      attrs.id = commentId
      var comment = new Comment(attrs)
      models.User.find(attrs.userId, function(user) {
        comment.user = user
        return callback(comment)
      })
    })
  }

  Comment.prototype = {
    save: function(callback) {
      var that = this
      // User us allowed to create a comment if and only if its
      // post is created and exists.
      db.exists('post:' + this.postId, function(err, res) {
        // post exists
        console.log("!!!")
        console.log(res)
        if (res == 1) { 
          that.createdAt = new Date().getTime()
          if (that.id === undefined) that.id = uuid.v4()

          // TODO: async.parallel([], function() { ... })
          db.multi()
            .hset('comment:' + that.id, 'body', that.body)
            .hset('comment:' + that.id, 'createdAt', that.createdAt)
            .hset('comment:' + that.id, 'userId', that.userId)
            .hset('comment:' + that.id, 'postId', that.postId)
            .exec(function(err, res) {
              models.Post.addComment(that.postId, that.id, function() {
                return callback(that)
              }) 
            })
        } else {
          // TODO: pass res=0 argument to the next block
          callback()
        }
      })
    },

    toJSON: function(callback) {
      console.log("- comment.toJSON()")
      var that = this;
      models.User.find(this.userId, function(user) {
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
