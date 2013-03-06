var uuid = require('node-uuid')
  , fs = require('fs')
  , gm = require('gm')
  , path = require('path')
  , models = require('../models')
  , async = require('async')
  , redis = require('redis')
  , _ = require('underscore')

exports.addModel = function(db) {
  function Post(params) {
    this.id = params.id
    this.body = params.body || ""
    this.userId = params.userId
    this.timelineId = params.timelineId
    this.files = params.files

    if (parseInt(params.createdAt))
      this.createdAt = parseInt(params.createdAt)
    if (parseInt(params.updatedAt))
      this.updatedAt = parseInt(params.updatedAt)
  }

  Post.getAttributes = function() {
    return ['id', 'body', 'createdAt', 'updatedAt', 'createdBy',
            'comments', 'attachments', 'likes']
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
      // - deletes likes key
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
            async.forEach(commentsIds, function(commentId, callback) {
              models.Comment.destroy(commentId, function(err, res) {
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
                  // this post does not have any associated with it attachments
                  db.del('post:' + postId + ':attachments', function(err, res) {
                    callback(err)
                  })
                } else {
                  callback(err)
                }
              })
            })
          })
        }
        // delete likes
        , function(callback) {
          db.del('post:' + postId + ':likes', function(err, res) {
            callback(err)
          })
        }
        // delete original post
        , function(callback) {
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
  // FIXME: it doesn't remove likes from timelines yet
  Post.removeLike = function(postId, userId, callback) {
    models.Post.findById(postId, function(err, post) {
      post.getSubscribedTimelinesIds(function(err, timelinesIds) {
        Post.bumpable(postId, function(bumpable) {
          db.srem('post:' + postId + ':likes', userId, function(err, res) {
            var pub = redis.createClient();

            pub.publish('removeLike',
                        JSON.stringify({ userId: userId,
                                         postId: postId }))

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
  }

  // XXX: this function duplicates 80% of addComment function - think
  // for a moment about this
  Post.addLike = function(postId, userId, callback) {
    models.Post.findById(postId, function(err, post) {
      post.getSubscribedTimelinesIds(function(err, timelinesIds) {
        models.User.findById(userId, function(err, user) {
          user.getRiverOfNewsId(function(err, timelineId) {
            timelinesIds.push(timelineId)
            user.getLikesTimeline({}, function(err, timeline) {
              timelinesIds.push(timeline.id)
              timeline.getSubscribers(function(err, users) {
                async.forEach(users, function(user, callback) {
                  user.getRiverOfNewsId(function(err, timelineId) {
                    timelinesIds.push(timelineId)

                    callback(err)
                  })
                }, function(err) {
                  Post.bumpable(postId, function(bumpable) {
                    db.sadd('post:' + postId + ':likes', userId, function(err, res) {
                      var pub = redis.createClient();

                      pub.publish('newLike',
                                  JSON.stringify({ userId: userId,
                                                   postId: postId }))

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
        })
      })
    })
  },

  // TODO: please test me -- bad luck came with this merge
  Post.addComment = function(postId, commentId, callback) {
    models.Post.findById(postId, function(err, post) {
      post.getSubscribedTimelinesIds(function(err, timelinesIds) {
        models.Comment.findById(commentId, function(err, comment) {
          models.User.findById(comment.userId, function(err, user) {
            user.getRiverOfNewsId(function(err, timelineId) {
              timelinesIds.push(timelineId)
              user.getCommentsTimeline({}, function(err, timeline) {
                timelinesIds.push(timeline.id)

                timelinesIds.push(timeline.id)
                timeline.getSubscribers(function(err, users) {
                  async.forEach(users, function(user, callback) {
                    user.getRiverOfNewsId(function(err, timelineId) {
                      timelinesIds.push(timelineId)

                      callback(err)
                    })
                  }, function(err) {
                    Post.bumpable(postId, function(bumpable) {
                      db.rpush('post:' + postId + ':comments', commentId, function(err, res) {
                        var pub = redis.createClient();

                        pub.publish('newComment', JSON.stringify({
                          postId: postId,
                          commentId: commentId
                        }))

                        timelinesIds = _.uniq(timelinesIds)
                        async.forEach(Object.keys(timelinesIds), function(timelineId, callback) {
                          if (bumpable) {
                            models.Timeline.updatePost(timelinesIds[timelineId], postId, function(err, res) {
                              pub.publish('newComment', JSON.stringify({
                                timelineId: timelinesIds[timelineId],
                                commentId: commentId
                              }))

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
    getSubscribedTimelinesIds: function(callback) {
      var that = this

      // TODO: double check if we need function here method
      this.getTimelinesIds(function(err, timelinesIds) {
        timelinesIds.push(that.timelineId)
        models.User.findById(that.userId, function(err, user) {
          user.getRiverOfNewsId(function(err, timelineId) {
            timelinesIds.push(timelineId)
            async.map(timelinesIds, function(timelineId, callback) {
              models.Timeline.findById(timelineId, {}, function(err, timeline) {
                timeline.getSubscribersIds(function(err, subscribersIds) {
                  callback(err, subscribersIds)
                })
              })
            }, function(err, subscribersIds) {
              async.forEach(subscribersIds.flatten(), function(subscriberId, callback) {
                models.User.findById(subscriberId, function(err, user) {
                  user.getRiverOfNewsId(function(err, riverId) {
                    timelinesIds.push(riverId)
                    callback(err)
                  })
                })
              }, function(err) {
                timelinesIds = _.uniq(timelinesIds)

                callback(err, timelinesIds)
              })
            })
          })
        })
      })
    },

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

    validate: function(callback) {
      var that = this

      db.exists('user:' + that.userId, function(err, userExists) {
        db.exists('timeline:' + that.timelineId, function(err, timelineExists) {
          db.exists('post:' + that.id, function(err, postExists) {
            callback(postExists == 0 &&
                     userExists == 1 &&
                     timelineExists == 1 &&
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
          db.hmset('post:' + that.id,
                   { 'body': (that.body || "").toString().trim(),
                     'timelineId': that.timelineId.toString(),
                     'userId': that.userId.toString(),
                     'createdAt': that.createdAt.toString(),
                     'updatedAt': that.updatedAt.toString()
                   }, function(err, res) {
                     that.saveAttachments(function(err, res) {
                       models.Timeline.newPost(that.id, function() {
                         // BUG: updatedAt is different now than we set few lines above
                         // XXX: we don't care (yet) if attachment wasn't saved
                         callback(null, that)
                       })
                     })
                   })
        } else {
          callback(1, that)
        }
      })
    },

    saveAttachments: function(callback) {
      var that = this
      var attachment

      if (this.files)
        attachment = this.files['file-0']

      if (!attachment)
        return callback(null, null)

      var tmpPath = attachment.path
      var filename = attachment.name
      var ext = path.extname(filename || '').split('.');
      ext = ext[ext.length - 1];

      var thumbnailId = uuid.v4()
      var thumbnailPath = __dirname + '/../../public/files/' + thumbnailId + '.' + ext
      var thumbnailHttpPath = '/files/' + thumbnailId + '.' + ext

      // TODO: currently it works only with images, must work with any
      // type of uploaded files.
      // TODO: encapsulate most if this method into attachments model
      gm(tmpPath).format(function(err, value) {
        if (err)
          return callback(err, value)

        gm(tmpPath)
          .resize('200', '200')
          .write(thumbnailPath, function(err) {
            if (err)
              return callback(err)

            var newThumbnail = new models.Attachment({
              'ext': ext,
              'filename': filename,
              'path': thumbnailHttpPath,
              'fsPath': thumbnailPath
            })

            newThumbnail.save(function(err, thumbnail) {
              var attachmentId = uuid.v4()
              var attachmentPath = __dirname + '/../../public/files/' + attachmentId + '.' + ext
              var attachmentHttpPath = '/files/' + attachmentId + '.' + ext

              var newAttachment = that.newAttachment({
                'ext': ext,
                'filename': filename,
                'path': attachmentHttpPath,
                'thumbnailId': thumbnail.id,
                'fsPath': attachmentPath
              })

              newAttachment.save(function(err, attachment) {
                if (!that.attachments)
                  that.attachments = []

                that.attachments.push(attachment)
                // move tmp file to a storage
                fs.rename(tmpPath, attachmentPath, function(err) {
                  callback(err, that)
                })
              })
            })
          })
      })
    },

    newAttachment: function(attrs) {
      attrs.postId = this.id
      
      return new models.Attachment(attrs)
    },

    toJSON: function(params, callback) {
      var that = this
        , json = {}
        , select = params['select'] ||
            models.Post.getAttributes()

      if (select.indexOf('id') != -1)
        json.id = that.id

      if (select.indexOf('timelineId') != -1)
        json.timelineId = that.timelineId

      if (select.indexOf('body') != -1)
        json.body = that.body

      if (select.indexOf('createdAt') != -1)
        json.createdAt = that.createdAt

      if (select.indexOf('updatedAt') != -1)
        json.updatedAt = that.updatedAt

      if (select.indexOf('comments') != -1) {
        this.getComments(function(err, comments) {
          async.map(comments, function(comment, callback) {
            if (!comment)
              return callback(err, null)

            comment.toJSON(params.comments || {}, function(err, json) {
              callback(err, json)
            })
          }, function(err, commentsJSON) {
            json.comments = commentsJSON

            if (select.indexOf('attachments') != -1) {
              that.getAttachments(function(err, attachments) {
                async.map(attachments, function(attachment, callback) {
                  attachment.toJSON(function(err, json) {
                    callback(err, json)
                  })
                }, function(err, attachmentsJSON) {
                  json.attachments = attachmentsJSON

                  if (select.indexOf('createdBy') != -1) {
                    models.User.findById(that.userId, function(err, user) {
                      user.toJSON(params.createdBy || {}, function(err, userJSON) {
                        json.createdBy = userJSON

                        if (select.indexOf('likes') != -1) {
                          that.getLikes(function(err, likes) {
                            async.map(likes, function(like, callback) {
                              like.toJSON(params.likes || {}, function(err, json) {
                                callback(err, json)
                              })
                            }, function(err, likesJSON) {
                              json.likes = likesJSON

                              callback(err, json)
                            })
                          })
                        } else {
                          callback(err, json)
                        }
                      })
                    })
                  } else {
                    callback(err, json)
                  }
                })
              })
            } else {
              callback(err, json)
            }
          })
        })
      } else {
        callback(null, json)
      }
    }

  }
  
  return Post;
}
