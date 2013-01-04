var uuid = require('node-uuid')
  , models = require('../models');

exports.add_model = function(db) {
  function Comment(params) {
    console.log('new Comment(' + JSON.stringify(params) + ')')
    this.body = params.body
    this.post_id = params.post_id

    this.created_at = parseInt(params.created_at) ||  null

    // TODO: not implemented yet
    this.updated_at = parseInt(params.updated_at) ||  null

    // params to filter
    this.id = params.id

    this.user_id = params.user_id
    this.user = params.user
  }

  Comment.find = function(comment_id, callback) {
    console.log('Comment.find("' + comment_id + '")')
    db.hgetall('comment:' + comment_id, function(err, attrs) {
      // TODO: check if we find a comment
      attrs.id = comment_id
      var comment = new Comment(attrs)
      models.User.find(attrs.user_id, function(user) {
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
      db.exists('post:' + this.post_id, function(err, res) {
        // post exists
        if (res == 1) { 
          that.created_at = new Date().getTime()
          if (that.id === undefined) that.id = uuid.v4()

          db.multi()
            .hset('comment:' + that.id, 'body', that.body)
            .hset('comment:' + that.id, 'created_at', that.created_at)
            .hset('comment:' + that.id, 'user_id', that.user_id)
            .hset('comment:' + that.id, 'post_id', that.post_id)
            .exec(function(err, res) {
              models.Post.addComment(that.post_id, that.id, function() {
                return callback()
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
      models.User.find(this.user_id, function(user) {
        user.toJSON(function(user) {
          callback({
            id: that.id,
            body: that.body,
            postId: that.post_id,
            createdBy: user,
            createdAt: that.created_at
          })
        })
      }
    )}

  }
  
  return Comment;
}
