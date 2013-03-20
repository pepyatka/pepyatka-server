var uuid = require('node-uuid')
  , redis = require('redis')
  , models = require('../models')
  , async = require('async')
  , _ = require('underscore')

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
      if (!attrs)
        return callback(err, null)

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
    models.Comment.findById(commentId, function(err, comment) {
      db.del('comment:' + commentId, function(err, res) {
        if (!comment)
          return callback(err, res)

        db.lrem('post:' + comment.postId + ':comments', 1, commentId, function(err, res) {
          var pub = redis.createClient();

          pub.publish('destroyComment', JSON.stringify({ postId: comment.postId,
                                                         commentId: commentId }))

          //TODO It's not the best way
          models.Post.findById(comment.postId, function(err, post) {
            if (post) {
              post.getComments(function(err, comments) {
                if (comments) {
                  if (_.where(comments, { userId: comment.userId }).length == 0) {
                    models.Stats.findByUserId(comment.userId, function(err, stats) {
                      if (stats) {
                        stats.removeDiscussion(function(err, stats) {
                          callback(err, res)
                        })
                      } else {
                        callback(err, res)
                      }
                    })
                  } else {
                    callback(err, res)
                  }
                } else {
                  callback(err, res)
                }
              })
            } else {
              callback(err, res)
            }
          })
        })
      })
    })
  }

  Comment.prototype = {
    validate: function(callback) {
      var that = this

      db.exists('user:' + that.userId, function(err, userExists) {
        db.exists('post:' + that.postId, function(err, postExists) {
          callback(postExists == 1 &&
                   userExists == 1 &&
                   that.body.trim().length > 0)
        })
      })
    },

    update: function(params, callback) {
      var that = this

      this.updatedAt = new Date().getTime()

      this.validate(function(valid) {
        if (valid) {
          db.exists('comment:' + that.id, function(err, res) {
            if (res == 1) {
              db.hmset('comment:' + that.id,
                       { 'body': (params.body.slice(0, 4096) || that.body).toString().trim(),
                         'updatedAt': that.createdAt.toString()
                       }, function(err, res) {
                         // TODO: a bit mess here: update method calls
                         // pubsub event and Post.newComment calls
                         // them as well
                         var pub = redis.createClient();

                         pub.publish('updateComment', JSON.stringify({
                           postId: that.postId,
                           commentId: that.id
                         }))

                         models.Post.findById(that.postId, function(err, post) {
                           post.getSubscribedTimelinesIds(function(err, timelinesIds) {
                             async.forEach(Object.keys(timelinesIds), function(timelineId, callback) {
                               pub.publish('updateComment', JSON.stringify({
                                 timelineId: timelinesIds[timelineId],
                                 commentId: that.id
                               }))

                               callback(null)
                             }, function(err) {
                               callback(err)
                             })
                           })
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

    create: function(callback) {
      var that = this

      this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      this.id = uuid.v4()

      this.validate(function(valid) {
        if (valid) {
          db.exists('comment:' + that.id, function(err, res) {
            if (res == 0) {
              db.hmset('comment:' + that.id,
                       { 'body': (that.body.slice(0, 4096) || "").toString().trim(),
                         'createdAt': that.createdAt.toString(),
                         'updatedAt': that.createdAt.toString(),
                         'userId': that.userId.toString(),
                         'postId': that.postId.toString()
                       }, function(err, res) {
                         models.Post.addComment(that.postId, that.id, function() {
                           //TODO It's not the best way
                           models.Post.findById(that.postId, function(err, post) {
                             if (post) {
                               post.getComments(function(err, comments) {
                                 if (comments) {
                                   if (_.where(comments, { userId: that.userId }).length == 1) {
                                     models.Stats.findByUserId(that.userId, function(err, stats) {
                                       if (stats) {
                                         stats.addDiscussion(function(err, stats) {
                                           callback(err, that)
                                         })
                                       } else {
                                         callback(err, that)
                                       }
                                     })
                                   } else {
                                     callback(err, that)
                                   }
                                 } else {
                                   callback(err, that)
                                 }
                               })
                             } else {
                               callback(err, that)
                             }
                           })
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
          user.toJSON(params.createdBy || {}, function(err, userJSON) {
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
