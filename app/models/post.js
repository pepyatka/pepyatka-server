var uuid = require('node-uuid')
  , fs = require('fs')
  , gm = require('gm')
  , path = require('path')
  , models = require('../models')
  , async = require('async')
  , redis = require('redis')
  , mkKey = require("../support/models").mkKey
  , _ = require('underscore')

var postK = "post";
var sourceK = "source";

exports.addModel = function(db) {
  function Post(params) {
    this.id = params.id
    this.body = params.body || ""
    this.userId = params.userId
    this.timelineIds = params.timelineIds;
    this.files = params.files
    this.source = params.source;

    if (parseInt(params.createdAt, 10))
      this.createdAt = parseInt(params.createdAt, 10)
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = parseInt(params.updatedAt, 10)
  }

  Post.getAttributes = function() {
    return ['id', 'body', 'createdAt', 'updatedAt', 'createdBy',
            'comments', 'attachments', 'likes']
  }

  Post.findById = function(postId, callback) {
    db.hgetall('post:' + postId, function(err, attrs) {
      if (err || !attrs) {
        return callback(1, null);
      }

      attrs.id = postId;

      db.smembers("post:" + postId + ":timelines", function(err, timelines) {
        if (err || !timelines) {
          return callback(1, null);
        }

        // FIXME: Ignore "everyone" and stuff like that
        attrs.timelineIds = timelines.filter(function(e) {
          return e != "everyone" && e != "undefined";
        });

        callback(err, new Post(attrs));
      });
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
        // update tags statistics
        function(callback) {
          models.Tag.extract(post.body, function(err, tagsInfo) {
            models.Tag.diff(tagsInfo, {}, function(err, resultTagsInfo) {
              models.Tag.update(resultTagsInfo, function(err) {
                callback(err)
              })
            })
          })
        },
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
                    if (res !== 0)
                      return callback(err)

                    db.del('post:' + postId + ':timelines', function(err, res) {
                      callback(err)
                    })
                  })
                },
                function(callback) {
                  async.forEach(timelinesIds, function(timelineId, callback) {
                    db.zcard('timeline:' + timelineId + ':posts', function(err, res) {
                      // that timeline is empty
                      if (res !== 0)
                        return callback(err)

                      db.del('post:' + postId + ':timelines', function(err, res) {
                        callback(err)
                      })
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
                  if (!attachment.thumbnailId)
                    return callback(err)

                  models.Attachment.destroy(attachment.thumbnailId, function(err, res) {
                    callback(err)
                  })
                })
              })
            }, function(err) {
              db.llen('post:' + postId + ':attachments', function(err, res) {
                if (res !== 0)
                  return callback(err)

                // this post does not have any associated with it attachments
                db.del('post:' + postId + ':attachments', function(err, res) {
                  callback(err)
                })
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
        //remove post from statistics
        models.Stats.findByUserId(post.userId, function(err, stats) {
          if (!stats) {
            stats = new models.Stats({
              userId: post.userId
            })
            stats.create(function(err, stats) {
              stats.removePost(function(err, stats) {
                callback(err)
              })
            })
          } else {
            stats.removePost(function(err, stats) {
              callback(err)
            })
          }
        })
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
      if (err) return callback(err)

      post.getSubscribedTimelinesIds(function(err, timelinesIds) {
        Post.bumpable(postId, function(bumpable) {
          db.srem('post:' + postId + ':likes', userId, function(err, res) {
            var pub = redis.createClient();

            pub.publish('removeLike',
                        JSON.stringify({ userId: userId,
                                         postId: postId }))

            timelinesIds = _.uniq(timelinesIds)
            async.forEach(Object.keys(timelinesIds), function(timelineId, callback) {
              // FIXME: defect: if post is not bumpable we won't send
              // removeLike event
              if (!bumpable)
                return callback(err, res)

                models.Timeline.updatePost(timelinesIds[timelineId], postId, function(err, res) {
                  pub.publish('removeLike',
                              JSON.stringify({ timelineId: timelinesIds[timelineId],
                                               userId: userId,
                                               postId: postId }))

                  callback(err, res);
                })
            }, function(err) {
              //remove like from statistics
              models.Stats.findByUserId(userId, function(err, stats) {
                if (!stats) {
                  stats = new models.Stats({
                    userId: userId
                  })
                  stats.create(function(err, stats) {
                    stats.removeLike(function(err, stats) {
                      callback(err, res)
                    })
                  })
                } else {
                  stats.removeLike(function(err, stats) {
                    callback(err, res)
                  })
                }
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
      if (err) return callback(err)

      post.getSubscribedTimelinesIds(function(err, timelinesIds) {
        models.User.findById(userId, function(err, user) {
          user.getRiverOfNewsId(function(err, timelineId) {
            var inRiverOfNews = timelinesIds.reduce(function (number, timelineItem){
                if (timelineItem === timelineId) number++
                return number
            }, 0);

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
                                                   postId: postId,
                                                   inRiverOfNews: inRiverOfNews }))

                      timelinesIds = _.uniq(timelinesIds)
                      async.forEach(Object.keys(timelinesIds), function(timelineId, callback) {
                        if (!bumpable)
                          return callback(err, res);

                        models.Timeline.updatePost(timelinesIds[timelineId], postId, function(err, res) {
                          pub.publish('newLike',
                                      JSON.stringify({ timelineId: timelinesIds[timelineId],
                                                       userId: userId,
                                                       postId: postId,
                                                       inRiverOfNews: inRiverOfNews }))
                          callback(err, res);
                        })
                      }, function(err) {
                        //add like into statistics
                        models.Stats.findByUserId(userId, function(err, stats) {
                          if (!stats) {
                            stats = new models.Stats({
                              userId: userId
                            })
                            stats.create(function(err, stats) {
                              stats.addLike(function(err, stats) {
                                callback(err, res)
                              })
                            })
                          } else {
                            stats.addLike(function(err, stats) {
                              callback(err, res)
                            })
                          }
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
  },

  // TODO: please test me -- bad luck came with this merge
  Post.addComment = function(postId, commentId, callback) {
    models.Post.findById(postId, function(err, post) {
      post.getSubscribedTimelinesIds(function(err, timelinesIds) {
        models.Comment.findById(commentId, function(err, comment) {
          models.User.findById(comment.userId, function(err, user) {
            user.getRiverOfNewsId(function(err, timelineId) {
              var inRiverOfNews = timelinesIds.reduce(function (number, timelineItem){
                if (timelineItem === timelineId) number++
                return number
              }, 0);

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
                          commentId: commentId,
                          inRiverOfNews: inRiverOfNews
                        }))

                        timelinesIds = _.uniq(timelinesIds)
                        async.forEach(Object.keys(timelinesIds), function(timelineId, callback) {
                          if (!bumpable)
                            return callback(err)

                          models.Timeline.updatePost(timelinesIds[timelineId], postId, function(err, res) {
                            pub.publish('newComment', JSON.stringify({
                              timelineId: timelinesIds[timelineId],
                              commentId: commentId,
                              inRiverOfNews: inRiverOfNews
                            }))

                            callback(err);
                          })
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
        timelinesIds = timelinesIds.concat(that.timelineIds)
        models.FeedFactory.findById(that.userId, function(err, user) {
          user.getRiverOfNewsId(function(err, timelineId) {
            timelinesIds.push(timelineId)
            async.map(timelinesIds, function(timelineId, callback) {
              models.Timeline.findById(timelineId, {}, function(err, timeline) {
                if (!timeline)
                  return callback(null, null)

                timeline.getSubscribersIds(function(err, subscribersIds) {
                  callback(err, subscribersIds)
                })
              })
            }, function(err, subscribersIds) {
              async.forEach(subscribersIds.flatten(), function(subscriberId, callback) {
                models.User.findById(subscriberId, function(err, user) {
                  if (!user)
                    return callback(null)

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
      if (this.attachmentsIds)
        return callback(null, this.attachmentsIds)

      var that = this
      db.lrange('post:' + this.id + ':attachments', 0, -1, function(err, attachmentsIds) {
        that.attachmentsIds = attachmentsIds || []
        callback(err, that.attachmentsIds)
      })
    },

    getAttachments: function(callback) {
      if (this.attachments)
        return callback(null, this.attachments)

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
    },

    getCommentsIds: function(callback) {
      if (this.commentsIds)
        return callback(null, this.commentsIds)

      var that = this
      db.lrange('post:' + this.id + ':comments', 0, -1, function(err, commentsIds) {
        that.commentsIds = commentsIds || []
        callback(err, that.commentsIds)
      })
    },

    getComments: function(callback) {
      if (this.comments)
        return callback(null, this.comments)

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
    },

    getTimelinesIds: function(callback) {
      if (this.timelinesIds)
        return callback(null, this.timelinesIds)

      var that = this
      db.smembers('post:' + this.id + ':timelines', function(err, timelinesIds) {
        that.timelinesIds = timelinesIds || []
        callback(err, that.timelinesIds)
      })
    },

    getLikesIds: function(callback) {
      if (this.likesIds)
        return callback(null, this.likesIds)

      var that = this
      db.smembers('post:' + this.id + ':likes', function(err, likesIds) {
        that.likesIds = likesIds || []
        callback(err, that.likesIds)
      })
    },

    getLikes: function(callback) {
      if (this.likes)
        return callback(null, this.likes)

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
    },

    validate: function(callback) {
      var that = this
      var timelineValid = true;

      db.exists('user:' + that.userId, function(err, userExists) {
        async.forEach(that.timelineIds || [], function(timelineId, done) {
          db.exists('timeline:' + timelineId, function(err, timelineExists) {
            timelineValid = timelineExists == 1;
            done();
          });
        }, function() {
          callback(userExists == 1 &&
                   timelineValid &&
                   that.body.trim().length > 0);
        });
      });
    },

    saveSource: function(f) {
      var post = this;

      if (post.source) {
        db.hmset(mkKey([postK, post.id, sourceK]), {
          type: post.source.type,
          sourceId: post.source.id
        }, f);
      } else {
        f();
      }
    },

    create: function(callback) {
      var that = this

      this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      this.id = uuid.v4()

      this.validate(function(valid) {
        if (!valid)
          return callback(1, that)

        db.exists('post:' + that.id, function(err, res) {
          if (res !== 0)
            return callback(err, res)

          var postBody = (that.body.slice(0, 8192) || "").toString().trim()
          async.parallel([
            function(done) {
              that.saveSource(function(err, res) {
                done(err);
              });
            },
            function(done) {
              db.hmset('post:' + that.id,
                       { 'body': postBody,
                         // TODO: this is a legacy param
                         'timelineId': that.timelineIds[0] ? that.timelineIds[0].toString() : null,
                         'userId': that.userId.toString(),
                         'createdAt': that.createdAt.toString(),
                         'updatedAt': that.updatedAt.toString()
                       }, function(err, res) {
                         that.saveAttachments(function(err, res) {
                           models.Timeline.newPost(that.id, that.timelineIds, function() {
                             models.Tag.extract(postBody, function(err, result) {
                               models.Tag.update(result, function(err) {
                                 models.Stats.findByUserId(that.userId, function(err, stats) {
                                   if (!stats) {
                                     stats = new models.Stats({
                                       userId: that.userId
                                     });
                                     stats.create(function(err, stats) {
                                       stats.addPost(function(err, stats) {
                                         // BUG: updatedAt is different now than we set few lines above
                                         // XXX: we don't care (yet) if attachment wasn't saved
                                         callback(null);
                                       });
                                     });
                                   } else {
                                     stats.addPost(function(err, stats) {
                                       // BUG: updatedAt is different now than we set few lines above
                                       // XXX: we don't care (yet) if attachment wasn't saved
                                       done(null);
                                     });
                                   }
                                 });
                               });
                             });
                           });
                         });
                       });

            }
          ], function(err) {
            callback(err, that);
          });
        })
      })
  },

    update: function(params, callback) {
      var that = this

      this.updatedAt = new Date().getTime()

      this.validate(function(valid) {
        if (!valid)
          return callback(1, that)

        db.exists('post:' + that.id, function(err, res) {
          if (res !== 1)
            return callback(err, res)

          var newBody = ((params.body || "").slice(0, 8192) || that.body).toString().trim()
          models.Tag.extract(that.body, function(err, oldPostTagsInfo) {
            models.Tag.extract(newBody, function(err, newPostTagsInfo) {
              models.Tag.diff(oldPostTagsInfo, newPostTagsInfo, function(err, diffTagsInfo) {
                models.Tag.update(diffTagsInfo, function(err) {
                  db.hmset('post:' + that.id,
                           { 'body': newBody,
                             'updatedAt': that.updatedAt.toString()
                           }, function(err, res) {
                             // TODO: a bit mess here: update method calls
                             // pubsub event and Timeline.newPost calls
                             // them as well
                             var pub = redis.createClient();

                             that.getSubscribedTimelinesIds(function(err, timelinesIds) {
                               async.forEach(timelinesIds, function(timelineId, callback) {
                                 pub.publish('updatePost', JSON.stringify({
                                   postId: that.id,
                                   timelineId: timelineId
                                 }))

                                 callback(null)
                               }, function(err) {
                                 callback(err, that)
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

    getGroups: function(callback) {
      if (!this.timelineIds)
        return callback(1, null)

      async.map(this.timelineIds, function(timelineId, done) {
        models.Timeline.findById(timelineId, {}, function(err, timeline) {
          if (timeline) {
            models.FeedFactory.findById(timeline.userId, function(err, feed) {
              if (feed.type === 'group' || timeline.name === 'Posts') {
                done(false, feed);
              } else {
                done(false, null);
              }
            });
          } else {
            done(true, null);
          }
        });
      }, function(err, res) {
        if (err) {
          callback(1, null);
        } else {
          callback(err, _.compact(res));
        }
      });
    },

    toJSON: function(params, callback) {
      var that = this
        , json = {}
        , select = params.select ||
            models.Post.getAttributes()

      var returnJSON = function(err) {
        var isReady = true
        if(select.indexOf('comments') != -1) {
          isReady = isReady && json.comments !== undefined
        }
        if(select.indexOf('attachments') != -1) {
          isReady = isReady && json.attachments !== undefined
        }
        if(select.indexOf('createdBy') != -1) {
          isReady = isReady && json.createdBy !== undefined
        }
        if(select.indexOf('likes') != -1) {
          isReady = isReady && json.likes !== undefined
        }
        if(select.indexOf('groups') != -1) {
          isReady = isReady && json.groups !== undefined
        }

        if(isReady) {
          callback(err, json)
        }
      }

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

            returnJSON(err)
          })
        })
      }

      if (select.indexOf('attachments') != -1) {
        that.getAttachments(function(err, attachments) {
          async.map(attachments, function(attachment, callback) {
            attachment.toJSON(function(err, json) {
              callback(err, json)
            })
          }, function(err, attachmentsJSON) {
            json.attachments = attachmentsJSON

            returnJSON(err)
          })
        })
      }

      if (select.indexOf('createdBy') != -1) {
        models.User.findById(that.userId, function(err, user) {
          if (err || !user) {
            json.createdBy = {}
            returnJSON(err)
          } else {
            user.toJSON(params.createdBy || {}, function(err, userJSON) {
              json.createdBy = userJSON
              returnJSON(err)
            })
          }
        })
      }

      if (select.indexOf('likes') != -1) {
        that.getLikes(function(err, likes) {
          async.map(likes, function(like, callback) {
            like.toJSON(params.likes || {}, function(err, json) {
              callback(err, json)
            })
          }, function(err, likesJSON) {
            json.likes = likesJSON

            returnJSON(err)
          })
        })
      }

      if (select.indexOf('groups') != -1) {
        that.getGroups(function(err, groups) {
          if (!groups || groups.length == 0) {
            json.groups = []
            returnJSON(err)
          } else {
            async.map(groups, function(group, done) {
              group.toJSON(params.groups, function(err, json) {
                done(false, json);
                returnJSON(err);
              });
            }, function(err, res) {
              if (err) {
                json.groups = [];
                returnJSON(err);
              } else {
                json.groups = res;
              }
            });
          }
        })
      }

      returnJSON(null)
    }

  }

  return Post;
}
