var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')
  , crypto = require('crypto')

exports.addModel = function(db) {
  function User(params) {
    this.id = params.id
    this.username = params.username || ""
    if (params.password)
      this.password = params.password // virtual attribute
    this.hashedPassword = params.hashedPassword
    this.salt = params.salt

    if (parseInt(params.createdAt))
      this.createdAt = parseInt(params.createdAt)
    if (parseInt(params.updatedAt))
      this.updatedAt = parseInt(params.updatedAt)
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

      db.exists('user:' + that.userId, function(err, userExists) {
        callback(userExists == 0 &&
                 that.username.length > 1)
      })
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
              }
            ], function(err, res) {
              callback(err, that)
            })
          })
        } else {
          callback(1, that)
        }
      })
    },

    subscribeTo: function(userId, callback) {
      var currentTime = new Date().getTime()
      var that = this

      // user cannot subscribe to his or herself
      if (userId == this.id) callback(1, null)

      models.User.findById(userId, function(err, user) {
        if (err) return callback(err, null)

        db.zadd('user:' + that.id + ':subscriptions', currentTime, userId, function(err, res) {
          callback(err, res)
        })
      })
    },

    unsubscribeTo: function(userId, callback) {
      var currentTime = new Date().getTime()
      var that = this
      models.User.findById(userId, function(err, user) {
        if (err) return callback(err, null)

        db.zrem('user:' + that.id + ':subscriptions', userId, function(err, res) {
          db.zcard('user:' + that.id + ':subscriptions', function(err, res) {
            if (res == 0)
              db.del('user:' + that.id + ':subscriptions', function(err, res) {
                callback(err, res)
              })
            else
              callback(err, res)
          })
        })
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
            models.User.findById(subscriptionsIds[subscriptionId], function(err, subscription) {
              callback(err, subscription)
            })
          }, function(err, subscriptions) {
            that.subscriptions = subscriptions
            callback(err, that.subscriptions)
          })
        })
      }
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
        if (timelines['RiverOfNews']) {
          callback(null, timelines['RiverOfNews'])
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
        if (timelines['Posts']) {
          callback(null, timelines['Posts'])
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

    toJSON: function(callback) {
      var that = this
      this.getSubscriptions(function(err, subscriptions) {
        async.map(subscriptions, function(subscription, callback) {
          subscription.toJSON(function(err, json) {
            callback(err, json)
          })
        }, function(err, subscriptionsJSON) {
          callback(err, {
            id: that.id,
            username: that.username,
            subscriptions: subscriptionsJSON,
            createdAt: that.createdAt,
            updatedAt: that.updatedAt
          })
        })
      })
    }

  }
  
  return User;
}
