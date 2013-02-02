var uuid = require('node-uuid')
  , models = require('../models')

exports.addModel = function(db) {
  function Comment(params) {
    this.id = params.id
    this.body = params.body || ""
    this.postId = params.postId
    this.userId = params.userId

    if (parseInt(params.createdAt))
      this.createdAt = parseInt(params.createdAt)
    if (parseInt(params.updatedAt))
      this.updatedAt = parseInt(params.updatedAt)
  }

  Comment.getAttributes = function() {
    return ['id', 'body', 'postId', 'updatedAt', 'createdBy', 'createdAt']
  }

  Comment.findById = function(commentId, callback) {
    db.hgetall('comment:' + commentId, function(err, attrs) {
      // TODO: check if we find a comment
      attrs.id = commentId
      var comment = new Comment(attrs)
      models.User.findById(attrs.userId, function(err, user) {
        comment.user = user
        callback(err, comment)
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
    validate: function(callback) {
      var that = this

      db.exists('user:' + that.userId, function(err, userExists) {
        db.exists('post:' + that.postId, function(err, postExists) {
          db.exists('comment:' + that.id, function(err, commentExists) {
            callback(postExists == 1 &&
                     userExists == 1 &&
                     commentExists == 0 &&
                     that.body.trim().length > 0)
          })
        })
      })
    },

    save: function(callback) {
      var that = this

      if (!this.createdAt)
        this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      if (this.id === undefined) this.id = uuid.v4()

      this.validate(function(valid) {
        if (valid) {
          // User is allowed to create a comment if and only if its
          // post is created and exists.
          db.exists('post:' + that.postId, function(err, res) {
            // post exists
            if (res == 1) {
              db.hmset('comment:' + that.id,
                       { 'body': (that.body || "").toString().trim(),
                         'createdAt': that.createdAt.toString(),
                         'updatedAt': that.createdAt.toString(),
                         'userId': that.userId.toString(),
                         'postId': that.postId.toString()
                       }, function(err, res) {
                         models.Post.addComment(that.postId, that.id, function() {
                           callback(err, that)
                         })
                       })
            } else {
              callback(err, that)
            }
          })
        } else {
          callback(1, that)
        }
      })
    },

    toJSON: function(params, callback) {
      var that = this
        , json = {}
        , select = params['select'] ||
            models.Comment.getAttributes()

      if (select.indexOf('id') != -1)
        json.id = that.id

      if (select.indexOf('body') != -1)
        json.body = that.body

      if (select.indexOf('postId') != -1)
        json.postId = that.postId

      if (select.indexOf('createdAt') != -1)
        json.createdAt = that.createdAt

      if (select.indexOf('updatedAt') != -1)
        json.updatedAt = that.createdAt

      if (select.indexOf('createdBy') != -1) {
        models.User.findById(this.userId, function(err, user) {
          user.toJSON({}, function(err, userJSON) {
            json.createdBy = userJSON

            callback(err, json)
          })
        })
      } else {
        callback(null, json)
      }
    }

  }
  
  return Comment;
}
