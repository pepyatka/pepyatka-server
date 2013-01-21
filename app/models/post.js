var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')
  , redis = require('redis')

exports.addModel = function(db) {
  function Post(params) {
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
          post.getCommentsIds(function(commentsIds) {
            async.forEach(commentsIds, function(comment, callback) {
              models.Comment.destroy(comment.id, function(err, res) {
                callback(err, res)
              })
            }, function(err) {
              db.del('post:' + post.id + ':comments', function(err, res) {
                callback()
              })
            })
          })
        }
        // delete attachments
        , function(callback) {
          post.getAttachments(function(attachmentsIds) {
            // delete all attachments asynchroniously
            async.forEach(attachmentsIds, function(attachment, callback) {
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

  Post.removeLike = function(postId, userId, callback) {
    db.srem('post:' + postId + ':likes', userId, function(err, res) {
      callback(err, res)
    })
  }

  // XXX: this function duplicates 80% of addComment function - think
  // for a moment about this
  Post.addLike = function(postId, userId, callback) {
    models.Post.findById(postId, function(post) {
      models.User.findById(userId, function(user) {
        models.User.findById(post.userId, function(postUser) {
          // update post in all connected timelines
          postUser.getTimelinesIds(function(timelinesIds) {
            // and additionally add this post to user who liked this
            // post to its river of news
            user.getRiverOfNewsId(function(riverId) {
              timelinesIds[riverId] = riverId

              Post.bumpable(postId, function(bumpable) {
                db.sadd('post:' + postId + ':likes', userId, function(err, res) {
                  async.forEach(Object.keys(timelinesIds), function(timelineId, callback) {
                    if (bumpable) {
                      models.Timeline.updatePost(timelinesIds[timelineId], postId, function() {
                        callback(null);
                      })
                    } else {
                      callback(null);
                    }
                  }, function(err) {
                    callback(err)
                  })
                })
              })
            })
          })
        })
      })
    })
  },

  Post.addComment = function(postId, commentId, callback) {
    models.Post.findById(postId, function(post) {
      models.Comment.findById(commentId, function(comment) {
        models.User.findById(comment.userId, function(commentUser) {
          models.User.findById(post.userId, function(postUser) {
            // update post in all connected timelines
            postUser.getTimelinesIds(function(timelinesIds) {
              // and additionally add this post to comment's author
              // river of news
              commentUser.getRiverOfNewsId(function(riverId) {
                timelinesIds[riverId] = riverId

                Post.bumpable(postId, function(bumpable) {
                  db.rpush('post:' + postId + ':comments', commentId, function(err, res) {
                    async.forEach(Object.keys(timelinesIds), function(timelineId, callback) {
                      if (bumpable) {
                        models.Timeline.updatePost(timelinesIds[timelineId], postId, function() {
                          callback(null);
                        })
                      } else {
                        callback(null);
                      }
                    }, function(err) {
                      callback(err)
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  }

  Post.addAttachment = function(postId, attachmentId, callback) {
    db.rpush('post:' + postId + ':attachments', attachmentId, function() {
      callback();
    })
  }

  Post.prototype = {
    getAttachmentsIds: function(callback) {
      if (this.attachmentsIds) {
        callback(this.attachmentsIds)
      } else {
        var that = this
        db.lrange('post:' + this.id + ':attachments', 0, -1, function(err, attachmentsIds) {
          that.attachmentsIds = attachmentsIds || []
          callback(that.attachmentsIds)
        })
      }
    },

    getAttachments: function(callback) {
      if (this.attachments) {
        callback(this.attachments)
      } else {
        var that = this
        this.getAttachmentsIds(function(attachmentsIds) {
          async.map(attachmentsIds, function(attachmentId, callback) {
            models.Attachment.findById(attachmentId, function(attachment) {
              callback(null, attachment)
            })
          }, function(err, attachments) {
            that.attachments = attachments
            callback(that.attachments)
          })
        })
      }
    },

    getCommentsIds: function(callback) {
      if (this.commentsIds) {
        callback(this.commentsIds)
      } else {
        var that = this
        db.lrange('post:' + this.id + ':comments', 0, -1, function(err, commentsIds) {
          that.commentsIds = commentsIds || []
          callback(that.commentsIds)
        })
      }
    },

    getComments: function(callback) {
      if (this.comments) {
        callback(this.comments)
      } else {
        var that = this
        this.getCommentsIds(function(commentsIds) {
          async.map(commentsIds, function(commentId, callback) {
            models.Comment.findById(commentId, function(comment) {
              callback(null, comment)
            })
          }, function(err, comments) {
            that.comments = comments
            callback(that.comments)
          })
        })
      }
    },

    getLikesIds: function(callback) {
      if (this.likesIds) {
        callback(this.likesIds)
      } else {
        var that = this
        db.smembers('post:' + this.id + ':likes', function(err, likesIds) {
          that.likesIds = likesIds || []
          callback(that.likesIds)
        })
      }
    },

    getLikes: function(callback) {
      if (this.likes) {
        callback(this.likes)
      } else {
        var that = this
        this.getLikesIds(function(likesIds) {
          async.map(likesIds, function(userId, callback) {
            models.User.findById(userId, function(user) {
              callback(null, user)
            })
          }, function(err, users) {
            that.likes = users
            callback(that.likes)
          })
        })
      }
    },

    save: function(callback) {
      var that = this

      if (!this.createdAt)
        this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      if (this.id === undefined) this.id = uuid.v4()

      db.hmset('post:' + this.id,
               { 'body': (this.body || "").toString().trim(),
                 'timelineId': this.timelineId.toString(),
                 'userId': this.userId.toString(),
                 'createdAt': this.createdAt.toString(),
                 'updatedAt': this.updatedAt.toString()
               }, function(err, res) {
                 models.Timeline.newPost(that.id, function() {
                   // BUG: updatedAt is different now than we set few lines above
                   callback(that)
                 })
               })
    },

    newAttachment: function(attrs) {
      attrs.postId = this.id
      
      return new models.Attachment(attrs)
    },

    toJSON: function(callback) {
      var that = this;

      this.getComments(function(comments) {
        models.User.findById(that.userId, function(user) {
          async.map(comments, function(comment, callback) {
            comment.toJSON(function(json) {
              callback(null, json)
            })
          }, function(err, commentsJSON) {
            that.getAttachments(function(attachments) {
              async.map(attachments, function(attachment, callback) {
                attachment.toJSON(function(json) {
                  callback(null, json)
                })
              }, function(err, attachmentsJSON) {
                user.toJSON(function(user) {
                  that.getLikes(function(likes) {
                    async.map(likes, function(like, callback) {
                      like.toJSON(function(json) {
                        callback(null, json)
                      })
                    }, function(err, likesJSON) {
                      callback({
                        id: that.id,
                        createdAt: that.createdAt,
                        updatedAt: that.updatedAt,
                        body: that.body,
                        createdBy: user,
                        comments: commentsJSON,
                        attachments: attachmentsJSON,
                        likes: likesJSON
                      })
                    })
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
