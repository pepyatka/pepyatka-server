var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')
  , redis = require('redis')
  , _ = require('underscore')

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

        callback(err, new Post(attrs))
      } else {
        callback(err, null)
      }
    })
  }

  // XXX: this is the longest method in the app. Review it once you have time
  Post.destroy = function(postId, callback) {
    models.Post.findById(postId, function(err, post) {
      // This is a parallel process: 
      // - deletes post from all users timelines
      // - deletes comments entities and comments array
      // - deletes attachments entities and attachments array
      // - delete original post
      async.parallel([
        // remove post from all timelines
        function(callback) {
          post.getTimelinesIds(function(err, timelinesIds) {
            var pub = redis.createClient();

            async.forEach(timelinesIds, function(timelineId, callback) {
              db.zrem('timeline:' + timelineId + ':posts', postId, function(err, res) {
                db.srem('post:' + postId + ':timelines', timelineId, function(err, res) {
                  // Notify clients that postId has been deleted
                  pub.publish('destroyPost', JSON.stringify({ postId: postId,
                                                              timelineId: timelineId }))

                  callback(err)
                })
              })
            }, function(err) {
              async.parallel([
                function(callback) {
                  db.scard('post:' + postId + ':timelines', function(err, res) {
                    // post does not belong to any timelines
                    if (res == 0) {
                      db.del('post:' + postId + ':timelines', function(err, res) {
                        callback(err)
                      })
                    } else {
                      callback(err)
                    }
                  })
                },
                function(callback) {
                  async.forEach(timelinesIds, function(timelineId, callback) {
                    db.zcard('timeline:' + timelineId + ':posts', function(err, res) {
                      // that timeline is empty
                      if (res == 0) {
                        db.del('post:' + postId + ':timelines', function(err, res) {
                          callback(err)
                        })
                      } else {
                        callback(err)
                      }
                    })
                  }, function(err) {
                    callback(err)
                  })
                }
              ], function(err) {
                callback(err)
              })
            })
          })
        }
        // delete comments
        , function(callback) {
          // delete all comments asynchroniously
          post.getCommentsIds(function(err, commentsIds) {
            async.forEach(commentsIds, function(comment, callback) {
              models.Comment.destroy(comment.id, function(err, res) {
                callback(err)
              })
            }, function(err) {
              db.del('post:' + post.id + ':comments', function(err, res) {
                callback(err)
              })
            })
          })
        }
        // delete attachments
        , function(callback) {
          post.getAttachments(function(err, attachments) {
            // delete all attachments asynchroniously
            async.forEach(attachments, function(attachment, callback) {
              db.lrem('post:' + postId + ':attachments', 0, attachment.id, function(err, res) {
                models.Attachment.destroy(attachment.id, function(err, res) {
                  // TODO: encapsulate thumbnail deletion inside of
                  // Attachment.destroy function
                  if (attachment.thumbnailId) {
                    models.Attachment.destroy(attachment.thumbnailId, function(err, res) {
                      callback(err)
                    })
                  } else {
                    callback(err)
                  }
                })
              })
            }, function(err) {
              db.llen('post:' + postId + ':attachments', function(err, res) {
                if (res == 0) {
                  // this post do not have any associated with it attachments
                  db.del('post:' + postId + ':attachments', function(err, res) {
                    callback(err)
                  })
                } else {
                  callback(err)
                }
              })
            })
          })
        },
        // delete original post
        function(callback) {
          db.del('post:' + postId, function(err, res) {
            callback(err)
          })
        }
      ], function(err) {
        callback(err)
      })
    })
  }

  // TBD: smart bump
  Post.bumpable = function(postId, callback) {
    callback(true);
  }

  // XXX: this function duplicates 95% of addLike function - think
  // for a moment about this
  Post.removeLike = function(postId, userId, callback) {
    models.Post.findById(postId, function(err, post) {
      models.User.findById(userId, function(err, user) {
        post.getTimelinesIds(function(err, timelinesIds) {
          user.getRiverOfNewsId(function(err, riverId) {
            timelinesIds[riverId] = riverId

            Post.bumpable(postId, function(bumpable) {
              db.srem('post:' + postId + ':likes', userId, function(err, res) {
                var pub = redis.createClient();
                timelinesIds = _.uniq(timelinesIds)
                async.forEach(Object.keys(timelinesIds), function(timelineId, callback) {
                  if (bumpable) {
                    models.Timeline.updatePost(timelinesIds[timelineId], postId, function(err, res) {
                      pub.publish('removeLike',
                                  JSON.stringify({ timelineId: timelinesIds[timelineId],
                                                   userId: userId,
                                                   postId: postId }))

                      callback(err, res);
                    })
                  } else {
                    callback(err, res);
                  }
                }, function(err) {
                  callback(err, res)
                })
              })
            })
          })
        })
      })
    })
  }

  // XXX: this function duplicates 80% of addComment function - think
  // for a moment about this
  Post.addLike = function(postId, userId, callback) {
    models.Post.findById(postId, function(err, post) {
      models.User.findById(userId, function(err, user) {
        post.getTimelinesIds(function(err, timelinesIds) {
          user.getRiverOfNewsId(function(err, riverId) {
            timelinesIds[riverId] = riverId

            Post.bumpable(postId, function(bumpable) {
              db.sadd('post:' + postId + ':likes', userId, function(err, res) {
                var pub = redis.createClient();
                timelinesIds = _.uniq(timelinesIds)
                async.forEach(Object.keys(timelinesIds), function(timelineId, callback) {
                  if (bumpable) {
                    models.Timeline.updatePost(timelinesIds[timelineId], postId, function(err, res) {
                      pub.publish('newLike',
                                  JSON.stringify({ timelineId: timelinesIds[timelineId],
                                                   userId: userId,
                                                   postId: postId }))

                      callback(err, res);
                    })
                  } else {
                    callback(err, res);
                  }
                }, function(err) {
                  callback(err, res)
                })
              })
            })
          })
        })
      })
    })
  },

  Post.addComment = function(postId, commentId, callback) {
    models.Post.findById(postId, function(err, post) {
      models.Comment.findById(commentId, function(err, comment) {
        models.User.findById(comment.userId, function(err, commentUser) {
          post.getTimelinesIds(function(err, timelinesIds) {
            commentUser.getRiverOfNewsId(function(err, riverId) {
              timelinesIds[riverId] = riverId
              Post.bumpable(postId, function(bumpable) {
                db.rpush('post:' + postId + ':comments', commentId, function(err, res) {
                  var pub = redis.createClient();
                  timelinesIds = _.uniq(timelinesIds)
                  async.forEach(Object.keys(timelinesIds), function(timelineId, callback) {
                    if (bumpable) {
                      models.Timeline.updatePost(timelinesIds[timelineId], postId, function(err, res) {
                        pub.publish('newComment', JSON.stringify({ timelineId: timelinesIds[timelineId],
                                                                   commentId: comment.id }))
                        callback(err);
                        })
                    } else {
                      callback(err);
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
  }

  Post.addAttachment = function(postId, attachmentId, callback) {
    db.rpush('post:' + postId + ':attachments', attachmentId, function(err, count) {
      callback(err, count);
    })
  }

  Post.prototype = {
    getAttachmentsIds: function(callback) {
      if (this.attachmentsIds) {
        callback(null, this.attachmentsIds)
      } else {
        var that = this
        db.lrange('post:' + this.id + ':attachments', 0, -1, function(err, attachmentsIds) {
          that.attachmentsIds = attachmentsIds || []
          callback(err, that.attachmentsIds)
        })
      }
    },

    getAttachments: function(callback) {
      if (this.attachments) {
        callback(null, this.attachments)
      } else {
        var that = this
        this.getAttachmentsIds(function(err, attachmentsIds) {
          async.map(attachmentsIds, function(attachmentId, callback) {
            models.Attachment.findById(attachmentId, function(err, attachment) {
              callback(err, attachment)
            })
          }, function(err, attachments) {
            that.attachments = attachments
            callback(err, that.attachments)
          })
        })
      }
    },

    getCommentsIds: function(callback) {
      if (this.commentsIds) {
        callback(null, this.commentsIds)
      } else {
        var that = this
        db.lrange('post:' + this.id + ':comments', 0, -1, function(err, commentsIds) {
          that.commentsIds = commentsIds || []
          callback(err, that.commentsIds)
        })
      }
    },

    getComments: function(callback) {
      if (this.comments) {
        callback(null, this.comments)
      } else {
        var that = this
        this.getCommentsIds(function(err, commentsIds) {
          async.map(commentsIds, function(commentId, callback) {
            models.Comment.findById(commentId, function(err, comment) {
              callback(err, comment)
            })
          }, function(err, comments) {
            that.comments = comments
            callback(err, that.comments)
          })
        })
      }
    },

    getTimelinesIds: function(callback) {
      if (this.timelinesIds) {
        callback(null, this.timelinesIds)
      } else {
        var that = this
        db.smembers('post:' + this.id + ':timelines', function(err, timelinesIds) {
          that.timelinesIds = timelinesIds || []
          callback(err, that.timelinesIds)
        })
      }
    },

    getLikesIds: function(callback) {
      if (this.likesIds) {
        callback(null, this.likesIds)
      } else {
        var that = this
        db.smembers('post:' + this.id + ':likes', function(err, likesIds) {
          that.likesIds = likesIds || []
          callback(err, that.likesIds)
        })
      }
    },

    getLikes: function(callback) {
      if (this.likes) {
        callback(null, this.likes)
      } else {
        var that = this
        this.getLikesIds(function(err, likesIds) {
          async.map(likesIds, function(userId, callback) {
            models.User.findById(userId, function(err, user) {
              callback(err, user)
            })
          }, function(err, users) {
            that.likes = users
            callback(err, that.likes)
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
                   callback(err, that)
                 })
               })
    },

    newAttachment: function(attrs) {
      attrs.postId = this.id
      
      return new models.Attachment(attrs)
    },

    toJSON: function(callback) {
      var that = this;

      this.getComments(function(err, comments) {
        models.User.findById(that.userId, function(err, user) {
          async.map(comments, function(comment, callback) {
            comment.toJSON(function(err, json) {
              callback(err, json)
            })
          }, function(err, commentsJSON) {
            that.getAttachments(function(err, attachments) {
              async.map(attachments, function(attachment, callback) {
                attachment.toJSON(function(err, json) {
                  callback(err, json)
                })
              }, function(err, attachmentsJSON) {
                user.toJSON(function(err, user) {
                  that.getLikes(function(err, likes) {
                    async.map(likes, function(like, callback) {
                      like.toJSON(function(err, json) {
                        callback(err, json)
                      })
                    }, function(err, likesJSON) {
                      callback(err, {
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
