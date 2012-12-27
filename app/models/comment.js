var uuid = require('node-uuid')
  , models = require('../models');

exports.add_model = function(db) {
  function Comment(params) {
    this.body = params.body
    this.id = params.id
    this.user_id = params.user_id
    this.post_id = params.post_id
  }

  Comment.find = function(comment_id, callback) {
    db.hgetall('comment:' + comment_id, function(err, attrs) {
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
    }
  }
  
  return Comment;
}
