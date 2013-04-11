var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')
  , crypto = require('crypto')

exports.addModel = function(db) {
  var statisticsSerializer = {
    select: ['userId', 'posts', 'likes', 'discussions', 'subscribers', 'subscriptions']
  }

  function User(params) {
    this.id = params.id
    this.username = params.username || ""
    if (params.password)
      this.password = params.password // virtual attribute
    this.hashedPassword = params.hashedPassword
    this.salt = params.salt

    if (parseInt(params.createdAt, 10))
      this.createdAt = parseInt(params.createdAt, 10)
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = parseInt(params.updatedAt, 10)

    this.type = "user"
  }

  User.getAttributes = function() {
    return ['id', 'username', 'subscriptions', 'subscribers', 'createdAt', 'updatedAt']
  }

  // TODO: create Anonymous model which is inherited from User
  // TODO: create new function findAnonId
  User.findAnon = function(callback) {
    // init anonymous user if it doesn't exist yet
    var returnAnon = function() {
      User.findByUsername('anonymous', function(err, user) {
        callback(err, user);
      })
    }

    var userId = uuid.v4();
    db.setnx('username:anonymous:uid', userId, function(err, res) {
      if (res == 1) {
        db.hsetnx('user:' + userId, 'username', 'anonymous', function(err, res) {
          returnAnon()
        })
      } else {
        returnAnon()
      }
    })
  }

  User.findByUsername = function(username, callback) {
    db.get('username:' + username + ':uid', function (err, userId) {
      User.findById(userId, function(err, user) {
        if (user)
          callback(err, user)
        else
          callback(err, null)
      })
    })  
  }

  User.findById = function(userId, callback) {
    db.hgetall('user:' + userId, function(err, attrs) {
      if (attrs === null)
        return callback(1, null)

      attrs.id = userId

      var newUser = new User(attrs)

      newUser.getTimelines({}, function(err, timelines) {
        newUser.timelines = timelines

        callback(err, newUser)
      })
    })
  },

  User.generateSalt = function(callback) {
    // NOTE: this is an async function - quite interesting
    return crypto.randomBytes(16, function(ex, buf) {
      var token = buf.toString('hex');
      callback(token)
    });
  }

  User.hashPassword = function(clearPassword) {
    // TODO: move this random string to configuration file
    return crypto.createHash("sha1").
      update(conf.saltSecret).
      update(clearPassword).
      digest("hex");
  },

  User.prototype = {
    updateHashedPassword: function(callback) {
      if (this.password)
        this.saltPassword(this.password, function() { callback() })
    },

    saltPassword: function(clearPassword, callback) {
      var that = this

      User.generateSalt(function(salt) {
        that.salt = salt
        that.hashedPassword = User.hashPassword(salt + User.hashPassword(clearPassword))

        callback()
      })
    },

    validPassword: function(clearPassword) {
      var hashedPassword = User.hashPassword(this.salt + User.hashPassword(clearPassword))
      return hashedPassword == this.hashedPassword
    },

    validate: function(callback) {
      var that = this
      var stopList = ['anonymous', 'everyone']

      callback(that.username.length > 1 &&
              stopList.indexOf(that.username) == -1)
    },

    save: function(callback) {
      var that = this

      // XXX: I copy these 4 lines from model to model - define proper
      // parent object and inherit all models from it
      if (!this.createdAt)
        this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      if (this.id === undefined) this.id = uuid.v4()

      this.validate(function(valid) {
        if (valid) {
          db.exists('user:' + that.id, function(err, res) {
            if (res === 0) {
              that.updateHashedPassword(function() {
                async.parallel([
                  function(done) {
                    db.hmset('user:' + that.id,
                             { 'username': that.username.toString().trim(),
                               'createdAt': that.createdAt.toString(),
                               'updatedAt': that.updatedAt.toString(),
                               'salt': that.salt.toString(),
                               'hashedPassword': that.hashedPassword.toString()
                             }, function(err, res) {
                               done(err, res)
                             })
                  },
                  function(done) {
                    db.set('username:' + that.username + ':uid', that.id, function(err, res) {
                      done(err, res)
                    })
                  },
                  function(done) {
                    var stats = new models.Stats({
                      userId: that.id
                    })
                    stats.create(function(err, stats) {
                      done(err, stats)
                    })
                  }
                ], function(err, res) {
                  callback(err, that)
                })
              })
            } else {
              callback(err, res)
            }
          })
        } else {
          callback(1, that)
        }
      })
    },

    subscribeTo: function(timelineId, callback) {
      var currentTime = new Date().getTime()
      var that = this

      models.Timeline.findById(timelineId, {}, function(err, timeline) {
        if (err) return callback(err, null)
        if (timeline.userId == that.id) return callback(null, null)

        var innerCallback = function(timelinesIds) {
          async.forEach(timelinesIds, function(timelineId, callback) {
            db.zadd('user:' + that.id + ':subscriptions', currentTime, timelineId, function(err, res) {
              db.zadd('timeline:' + timelineId + ':subscribers', currentTime, that.id, function(err, res) {
                that.getRiverOfNewsId(function(err, riverOfNewsId) {
                  db.zunionstore(
                    'timeline:' + riverOfNewsId + ':posts', 2,
                    'timeline:' + riverOfNewsId + ':posts',
                    'timeline:' + timelineId + ':posts',
                    'AGGREGATE', 'MAX', function(err, res) {
                      timeline.getPosts(0, -1, function(err, posts) {
                        async.forEach(posts, function(post, callback) {
                          // XXX: kind of dup
                          db.sadd('post:' + post.id + ':timelines', riverOfNewsId, function(err, res) {
                            callback(err)
                          })
                        }, function(err) {
                          callback(err)
                        })
                      })
                    })
                })
              })
            })
          }, function(err) {
            //add subscriber and subscription into statistics
            models.Stats.findByUserId(that.id, function(err, stats) {
              if (!stats) {
                stats = new models.Stats({
                  userId: that.id
                })
                stats.create(function(err, stats) {
                  stats.addSubscription(function(err, stats) {
                    models.Stats.findByUserId(timeline.userId, function(err, stats) {
                      stats.addSubscriber(function(err, stats) {
                        callback(err, that)
                      })
                    })
                  })
                })
              } else {
                stats.addSubscription(function(err, stats) {
                  models.Stats.findByUserId(timeline.userId, function(err, stats) {
                    stats.addSubscriber(function(err, stats) {
                      callback(err, that)
                    })
                  })
                })
              }
            })
          })
        }

        var timelinesIds = [timelineId]

        if (timeline.name == 'Posts') {
          models.User.findById(timeline.userId, function(err, user) {
            user.getCommentsTimelineId(function(err, commentsTimelineId) {
              user.getLikesTimelineId(function(err, likesTimelineId) {
                timelinesIds = timelinesIds.concat([commentsTimelineId, likesTimelineId])

                innerCallback(timelinesIds)
              })
            })
          })
        } else {
          innerCallback(timelinesIds)
        }
      })
    },

    unsubscribeTo: function(timelineId, callback) {
      var currentTime = new Date().getTime()
      var that = this
      models.Timeline.findById(timelineId, {}, function(err, timeline) {
        if (err) return callback(err, null)

        var innerCallback = function(timelinesIds) {
          async.forEach(timelinesIds, function(timelineId, callback) {
            db.zrem('user:' + that.id + ':subscriptions', timelineId, function(err, res) {
              db.zrem('timeline:' + timelineId + ':subscribers', currentTime, that.id, function(err, res) {
                that.getRiverOfNewsId(function(err, riverOfNewsId) {
                  // zinterstore saves results to a key. so we have to
                  // create a temporary storage
                  var randomKey = 'timeline:' + riverOfNewsId + ':random:' + uuid.v4()

                  db.zinterstore(
                    randomKey, 2,
                    'timeline:' + riverOfNewsId + ':posts',
                    'timeline:' + timelineId + ':posts',
                    'AGGREGATE', 'MAX', function(err, res) {
                      // now we need to delete these posts from RiverOfNews
                      db.zrange(randomKey, 0, -1, function(err, postsIds) {
                        async.forEach(postsIds, function(postId, callback) {
                          // XXX: kind of dup
                          db.srem('post:' + postId + ':timelines', riverOfNewsId, function(err, res) {
                            // TODO: delete if and only if user (this) is
                            // not a participant of this discussion
                            db.zrem('timeline:' + riverOfNewsId + ':posts', postId, function(err, res) {
                              callback(err)
                            })
                          })
                        }, function(err) {
                          db.del(randomKey, function(err, res) {
                            db.zcard('user:' + that.id + ':subscriptions', function(err, res) {
                              if (res === 0)
                                db.del('user:' + that.id + ':subscriptions', function(err, res) {
                                  callback(err, res)
                                })
                              else
                                callback(err)
                            })
                          })
                        })
                      })
                    })
                })
              })
            })
          }, function(err) {
            //remove subscriber and subscription from statistics
            models.Stats.findByUserId(that.id, function(err, stats) {
              if (!stats) {
                stats = new models.Stats({
                  userId: that.id
                })
                stats.create(function(err, stats) {
                  stats.removeSubscription(function(err, stats) {
                    models.Stats.findByUserId(timeline.userId, function(err, stats) {
                      stats.removeSubscriber(function(err, stats) {
                        callback(err)
                      })
                    })
                  })
                })
              } else {
                stats.removeSubscription(function(err, stats) {
                  models.Stats.findByUserId(timeline.userId, function(err, stats) {
                    stats.removeSubscriber(function(err, stats) {
                      callback(err)
                    })
                  })
                })
              }
            })
          })
        }

        var timelinesIds = [timelineId]

        if (timeline.name == 'Posts') {
          models.User.findById(timeline.userId, function(err, user) {
            user.getCommentsTimelineId(function(err, commentsTimelineId) {
              user.getLikesTimelineId(function(err, likesTimelineId) {
                timelinesIds = timelinesIds.concat([commentsTimelineId, likesTimelineId])

                innerCallback(timelinesIds)
              })
            })
          })
        } else {
          innerCallback(timelinesIds)
        }
      })
    },

    getSubscriptionsIds: function(callback) {
      if (this.subscriptionsIds) {
        callback(null, this.subscriptionsIds)
      } else {
        var that = this
        db.zrevrange('user:' + this.id + ':subscriptions', 0, -1, function(err, subscriptionsIds) {
          that.subscriptionsIds = subscriptionsIds || []
          callback(err, that.subscriptionsIds)
        })
      }
    },

    getSubscriptions: function(callback) {
      if (this.subscriptions) {
        callback(null, this.subscriptions)
      } else {
        var that = this
        this.getSubscriptionsIds(function(err, subscriptionsIds) {
          async.map(Object.keys(subscriptionsIds), function(subscriptionId, callback) {
            models.Timeline.findById(subscriptionsIds[subscriptionId], {}, function(err, subscription) {
              callback(err, subscription)
            })
          }, function(err, subscriptions) {
            that.subscriptions = subscriptions.compact()
            callback(err, that.subscriptions)
          })
        })
      }
    },

    getSubscriptionsCount: function(callback) {
      var that = this
      db.zcount('user:' + this.id + ':subscriptions', '-inf', '+inf', function(err, res){
        callback(err, res)
      })
    },

    newPost: function(attrs, callback) {
      attrs.userId = this.id

      this.getPostsTimelineId(function(err, timelineId) {
        attrs.timelineId = timelineId

        callback(err, new models.Post(attrs))
      })
    },

    // XXX: do not like the design of this method. I'd say better to
    // put it into Post model
    newComment: function(attrs) {
      attrs.userId = this.id

      return new models.Comment(attrs)
    },

    getRiverOfNewsId: function(callback) {
      var that = this;
      this.getTimelinesIds(function(err, timelines) {
        if (timelines.RiverOfNews) {
          callback(null, timelines.RiverOfNews)
        } else {
          // somehow this user has deleted its main timeline - let's
          // recreate from the scratch
          var timelineId = uuid.v4();
          db.hset('user:' + that.id + ':timelines', 'RiverOfNews',
                  timelineId, function(err, res) {
                    db.hmset('timeline:' + timelineId,
                             { 'name': 'River of news',
                               'userId': that.id }, function(err, res) {
                                 callback(err, timelineId);
                               })
                  })
        }
      })
    },

    getRiverOfNews: function(params, callback) {
      if (this.riverOfNews) {
        callback(null, this.riverOfNews)
      } else {
        var that = this
        this.getRiverOfNewsId(function(err, timelineId) {
          models.Timeline.findById(timelineId, params, function(err, timeline) {
            that.riverOfNews = timeline
            callback(err, that.riverOfNews)
          })
        })
      }
    },

    // TODO: DRY - getRiverOfNews
    getPostsTimelineId: function(callback) {
      var that = this;
      this.getTimelinesIds(function(err, timelines) {
        if (timelines.Posts) {
          callback(null, timelines.Posts)
        } else {
          // somehow this user has deleted its main timeline - let's
          // recreate from the scratch
          var timelineId = uuid.v4();
          db.hset('user:' + that.id + ':timelines', 'Posts',
                  timelineId, function(err, res) {
                    db.hmset('timeline:' + timelineId,
                             { 'name': 'Posts',
                               'userId': that.id }, function(err, res) {
                                 callback(err, timelineId);
                               })
                  })
        }
      })
    },

    getPostsTimeline: function(params, callback) {
      if (this.postsTimeline) {
        callback(null, this.postsTimeline)
      } else {
        var that = this
        this.getPostsTimelineId(function(err, timelineId) {
          models.Timeline.findById(timelineId, params, function(err, timeline) {
            that.postsTimeline = timeline
            callback(err, that.postsTimeline)
          })
        })
      }
    },

    // TODO: DRY - getRiverOfNews
    getLikesTimelineId: function(callback) {
      var that = this;
      this.getTimelinesIds(function(err, timelines) {
        if (timelines.Likes) {
          callback(null, timelines.Likes)
        } else {
          // somehow this user has deleted its main timeline - let's
          // recreate from the scratch
          var timelineId = uuid.v4();
          db.hset('user:' + that.id + ':timelines', 'Likes',
                  timelineId, function(err, res) {
                    db.hmset('timeline:' + timelineId,
                             { 'name': 'Likes',
                               'userId': that.id }, function(err, res) {
                                 callback(err, timelineId);
                               })
                  })
        }
      })
    },

    getLikesTimeline: function(params, callback) {
      if (this.likesTimeline) {
        callback(null, this.likesTimeline)
      } else {
        var that = this
        this.getLikesTimelineId(function(err, timelineId) {
          models.Timeline.findById(timelineId, params, function(err, timeline) {
            that.likesTimeline = timeline
            callback(err, that.likesTimeline)
          })
        })
      }
    },

    // TODO: DRY - getRiverOfNews
    getCommentsTimelineId: function(callback) {
      var that = this;
      this.getTimelinesIds(function(err, timelines) {
        if (timelines.Comments) {
          callback(null, timelines.Comments)
        } else {
          // somehow this user has deleted its main timeline - let's
          // recreate from the scratch
          var timelineId = uuid.v4();
          db.hset('user:' + that.id + ':timelines', 'Comments',
                  timelineId, function(err, res) {
                    db.hmset('timeline:' + timelineId,
                             { 'name': 'Comments',
                               'userId': that.id }, function(err, res) {
                                 callback(err, timelineId);
                               })
                  })
        }
      })
    },

    getCommentsTimeline: function(params, callback) {
      if (this.commentsTimeline) {
        callback(null, this.commentsTimeline)
      } else {
        var that = this
        this.getCommentsTimelineId(function(err, timelineId) {
          models.Timeline.findById(timelineId, params, function(err, timeline) {
            that.commentsTimeline = timeline
            callback(err, that.commentsTimeline)
          })
        })
      }
    },

    getTimelinesIds: function(callback) {
      // TODO: following commented out cache is going to break
      // preconditions of Timeline functional test

      // if (this.timelinesIds) {
      //   callback(null, this.timelinesIds)
      // } else {
        var that = this
        db.hgetall('user:' + this.id + ':timelines', function(err, timelinesIds) {
          that.timelinesIds = timelinesIds || []
          callback(err, that.timelinesIds)
        })
      // }
    },

    getTimelines: function(params, callback) {
      if (this.timelines) {
        callback(null, this.timelines)
      } else {
        var that = this
        this.getTimelinesIds(function(err, timelinesIds) {
          async.map(Object.keys(timelinesIds), function(timelineId, callback) {
            models.Timeline.findById(timelinesIds[timelineId], params, function(err, timeline) {
              callback(err, timeline)
            })
          }, function(err, timelines) {
            that.timelines = timelines
            callback(err, that.timelines)
          })
        })
      }
    },

    toJSON: function(params, callback) {
      var that = this
        , json = {}
        , select = params.select ||
            models.User.getAttributes()

      var returnJSON = function(err) {
        var isReady = true
        if(select.indexOf('subscriptions') != -1) {
          isReady = json.subscriptions !== undefined
        }
        if(select.indexOf('statistics') != -1) {
          isReady = json.statistics !== undefined
        }

        if(isReady) {
          callback(err, json)
        }
      }

      if (select.indexOf('id') != -1) 
        json.id = that.id

      if (select.indexOf('username') != -1)
        json.username = that.username

      if (select.indexOf('createdAt') != -1)
        json.createdAt = that.createdAt

      if (select.indexOf('updatedAt') != -1)
        json.updatedAt = that.updatedAt

      if (select.indexOf('type') != -1)
        json.type = that.type

      if (select.indexOf('subscriptions') != -1) {
        that.getSubscriptions(function(err, subscriptions) {
          async.map(subscriptions, function(subscription, callback) {
            subscription.toJSON(params.subscriptions || {}, function(err, json) {
              callback(err, json)
            })
          }, function(err, subscriptionsJSON) {
            json.subscriptions = subscriptionsJSON

            returnJSON(err)
          })
        })
      } else {
        returnJSON(null)
      }

      if (select.indexOf('statistics') != -1) {
        var statistics = {}
        models.Stats.findByUserId(that.id, function(err, stats) {
          if (stats) {
            stats.toJSON(statisticsSerializer, function(err, statistics) {
              json.statistics = statistics
              returnJSON(err)
            })
          } else {
            callback(null)
          }
        })
      }
    }
  }
  
  return User;
}
