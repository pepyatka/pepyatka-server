var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')
  , redis = require('redis')

exports.addModel = function(db) {
  function Post(params) {
    console.log('new Post(' + JSON.stringify(params) + ')')
    this.body = params.body

    // params to filter
    this.id = params.id
    this.createdAt = parseInt(params.createdAt) || null
    this.updatedAt = parseInt(params.updatedAt) || null

    this.comments = params.comments || []
    this.attachments = params.attachments || []

    this.userId = params.userId
    this.user = params.user
  }

  Post.find = function(postId, callback) {
    console.log('Post.find("' + postId + '")')
    db.hgetall('post:' + postId, function(err, attrs) {
      if (attrs) {
        attrs.id = postId
        var post = new Post(attrs)

        post.getComments(function(comments) {
          post.comments = comments
          models.User.find(attrs.userId, function(user) {
            post.user = user

            post.getAttachments(function(attachments) {
              post.attachments = attachments

              return callback(post)
            })
          })
        })
      } else {
        return callback(null)
      }
    })
  }

  // XXX: this is the longest method in the app. Review it once you have time
  Post.destroy = function(postId, callback) {
    console.log('Post.destroy("' + postId + '")')

    models.Post.find(postId, function(post) {
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
    return callback(true);
  }

  Post.addComment = function(postId, commentId, callback) {
    console.log('Post.addComment("' + postId + '", "' + commentId + '")')
    db.hget('post:' + postId, 'userId', function(err, userId) {
      db.rpush('post:' + postId + ':comments', commentId, function() {
        // Can we bump this post?
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

  Post.addAttachment = function(postId, attachmentId, callback) {
    console.log('Post.addAttachment("' + postId + '", "' + attachmentId + '")')

    db.rpush('post:' + postId + ':attachments', attachmentId, function() {
      return callback();
    })
  }

  Post.prototype = {
    getAttachments: function(callback) {
      console.log('- post.getAttachments()')
      var that = this
      db.lrange('post:' + this.id + ':attachments', 0, -1, function(err, attachments) {
        async.map(attachments, function(attachmentId, callback) {
          models.Attachment.find(attachmentId, function(attachment) {
            callback(null, attachment)
          })
        }, function(err, attachments) {
          callback(attachments)
        })
      })
    },

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

    save: function(callback) {
      console.log('- post.save()')
      var that = this
      if (!this.createdAt)
        this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      if (this.id === undefined) this.id = uuid.v4()

      db.hmset('post:' + this.id,
               { 'body': this.body.toString(),
                 'createdAt': this.createdAt.toString(),
                 'updatedAt': this.updatedAt.toString(),
                 'userId': this.userId.toString()
               }, function(err, res) {
                 models.Timeline.newPost(that.userId, that.id, function() {
                   // BUG: updatedAt is different now than we set few lines above
                   return callback(that)
                 })
               })
    },

    newAttachment: function(attrs) {
      console.log('- post.newAttachment()')
      attrs.postId = this.id
      
      return new models.Attachment(attrs)
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
            async.map(that.attachments, function(attachment, callback) {
              attachment.toJSON(function(json) {
                return callback(null, json)
              })
            }, function(err, attachmentsJSON) {
              user.toJSON(function(user) {
                return callback({ 
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
    }

  }
  
  return Post;
}
