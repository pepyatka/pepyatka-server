var uuid = require('node-uuid')
  , models = require('../models');

exports.add_model = function(db) {
  function Comment(params) {
    console.log('new Comment("' + params + '")')
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
      this.created_at = new Date().getTime()
      if (this.id === undefined) this.id = uuid.v4()

      db.multi()
        .hset('comment:' + this.id, 'body', this.body)
        .hset('comment:' + this.id, 'created_at', this.created_at)
        .hset('comment:' + this.id, 'user_id', this.user_id)
        .hset('comment:' + this.id, 'post_id', this.post_id)
        .exec(function(err, res) {
          models.Post.addComment(that.post_id, that.id, function() {
            return callback()
          }) 
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
