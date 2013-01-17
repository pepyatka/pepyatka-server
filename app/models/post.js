var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')
  , redis = require('redis')
  , logger = require('../../logger').create()

exports.addModel = function(db) {
  function Post(params) {
    logger.debug('new Post(' + JSON.stringify(params) + ')')

    this.id = params.id
    this.body = params.body
    this.userId = params.userId
    this.timelineId = params.timelineId

    if (parseInt(params.createdAt))
      this.createdAt = parseInt(params.createdAt)
    if (parseInt(params.updatedAt))
      this.updatedAt = parseInt(params.updatedAt)
  }

  Post.findById = function(postId, callback) {
    logger.debug('Post.findById("' + postId + '")')

    db.hgetall('post:' + postId, function(err, attrs) {
      if (attrs) {
        attrs.id = postId

        callback(new Post(attrs))
      } else {
        callback(null)
      }
    })
  }

  // XXX: this is the longest method in the app. Review it once you have time
  Post.destroy = function(postId, callback) {
    logger.debug('Post.destroy("' + postId + '")')

    models.Post.findById(postId, function(post) {
      // This is a parallel process: 
      // - deletes post from user's timeline
      // - deletes comments entities and comments array
      // - deletes attachments entities and attachments array
      async.parallel([
        // remove post from timeline
        function(callback) { 
          db.zrem('timeline:' + post.userId, postId, function(err, res) {
            callback(err, res)
          }) 
        }
        // delete comments
        , function(callback) {
          // delete all comments asynchroniously
          async.forEach(post.comments, function(comment, callback) {
            models.Comment.destroy(comment.id, function(err, res) {
              callback(err, res)
            })
          }, function(err) {
            db.del('post:' + post.id + ':comments', function(err, res) {
              callback()
            })
          })
        }
        // delete attachments
        , function(callback) {
          // delete all attachments asynchroniously
          async.forEach(post.attachments, function(attachment, callback) {
            models.Attachment.destroy(attachment.id, function(err, res) {
              if (attachment.thumbnailId) {
                models.Attachment.destroy(attachment.thumbnailId, function(err, res) {
                  callback(err, res)
                })
              } else {
                callback(err, res)
              }
            })
          }, function(err) {
            db.del('post:' + post.id + ':attachments', function(err, res) {
              callback()
            })
          })
        }
      ], function(err, res) {
        // Notify clients that postId has been deleted
        var pub = redis.createClient();
        pub.publish('destroyPost', postId)

        callback(err, res)
      })
    })
  }

  // TBD: smart bump
  Post.bumpable = function(postId, callback) {
    callback(true);
  }

  Post.addComment = function(postId, commentId, callback) {
    logger.debug('Post.addComment("' + postId + '", "' + commentId + '")')
    db.hget('post:' + postId, 'timelineId', function(err, timelineId) {
      db.rpush('post:' + postId + ':comments', commentId, function() {
        // Can we bump this post?
        Post.bumpable(postId, function(bump) {
          if (bump) {
            models.Timeline.updatePost(timelineId, postId, function() {
              callback();
            })
          } else {
            callback();
          }
        })
      })
    })
  }

  Post.addAttachment = function(postId, attachmentId, callback) {
    logger.debug('Post.addAttachment("' + postId + '", "' + attachmentId + '")')

    db.rpush('post:' + postId + ':attachments', attachmentId, function() {
      callback();
    })
  }

  Post.prototype = {
    getAttachments: function(callback) {
      logger.debug('- post.getAttachments()')
      var that = this
      db.lrange('post:' + this.id + ':attachments', 0, -1, function(err, attachments) {
        async.map(attachments, function(attachmentId, callback) {
          models.Attachment.findById(attachmentId, function(attachment) {
            callback(null, attachment)
          })
        }, function(err, attachments) {
          callback(attachments)
        })
      })
    },

    // Return all comments
    getComments: function(callback) {
      logger.debug('- post.getComments()')
      if (this.comments) {
        callback(this.comments)
      } else {
        var that = this
        db.lrange('post:' + this.id + ':comments', 0, -1, function(err, comments) {
          async.map(comments, function(commentId, callback) {
            models.Comment.findById(commentId, function(comment) {
              callback(null, comment)
            })
          }, function(err, comments) {
            this.comments = comments
            callback(comments)
          })
        })
      }
    },

    // Return all attachments
    getAttachments: function(callback) {
      logger.debug('- post.getAttachments()')
      if (this.attachments) {
        callback(this.attachments)
      } else {
        var that = this
        db.lrange('post:' + this.id + ':attachments', 0, -1, function(err, attachments) {
          async.map(attachments, function(attachmentId, callback) {
            models.Attachment.findById(attachmentId, function(attachment) {
              callback(null, attachment)
            })
          }, function(err, attachments) {
            this.attachments = attachments
            callback(attachments)
          })
        })
      }
    },

    save: function(callback) {
      logger.debug('- post.save()')

      var that = this

      if (!this.createdAt)
        this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      if (this.id === undefined) this.id = uuid.v4()

      db.hmset('post:' + this.id,
               { 'body': this.body.toString().trim(),
                 'timelineId': this.timelineId.toString(),
                 'userId': this.userId.toString(),
                 'createdAt': this.createdAt.toString(),
                 'updatedAt': this.updatedAt.toString()
               }, function(err, res) {
                 models.Timeline.newPost(that.timelineId, that.id, function() {
                   // BUG: updatedAt is different now than we set few lines above
                   callback(that)
                 })
               })
    },

    newAttachment: function(attrs) {
      logger.debug('- post.newAttachment()')
      attrs.postId = this.id
      
      return new models.Attachment(attrs)
    },

    toJSON: function(callback) {
      logger.debug('- post.toJSON()')
      var that = this;

      this.getComments(function(comments) {
        models.User.findById(that.userId, function(user) {
          async.map(comments, function(comment, callback) {
            comment.toJSON(function(json) {
              callback(null, json)
            })
          }, function(err, commentsJSON) {
            that.getAttachments(function() {
              async.map(attachments, function(attachment, callback) {
                attachment.toJSON(function(json) {
                  callback(null, json)
                })
              }, function(err, attachmentsJSON) {
                user.toJSON(function(user) {
                  callback({
                    id: that.id,
                    createdAt: that.createdAt,
                    updatedAt: that.updatedAt,
                    body: that.body,
                    createdBy: user,
                    comments: commentsJSON,
                    attachments: attachmentsJSON
                  })
                })
              })
            })
          })
        })
      })
    }

  }
  
  return Post;
}
