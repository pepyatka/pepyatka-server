var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')
  , crypto = require('crypto')

exports.addModel = function(db) {
  function User(params) {
    this.id = params.id
    this.username = params.username
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
      User.findByUsername('anonymous', function(user) {
        callback(user);
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
      User.findById(userId, function(user) {
        // TODO: callback(err, user)
        if (user.id)
          callback(user)
        else
          callback(null)
      })
    })  
  }

  User.findById = function(userId, callback) {
    db.hgetall('user:' + userId, function(err, attrs) {
      // XXX: Seems it's either deleted user or broken session. Redirect to
      // auth method... some day.
      if (attrs === null) attrs = {}

      attrs.id = userId

      // TODO: callback(err, user)
      var newUser = new User(attrs)

      newUser.getTimelines(function(timelines) {
        newUser.timelines = timelines

        callback(newUser)
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
      if (this.password) {
        this.saltPassword(this.password, function() {
          callback()
        })
      }
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

    save: function(callback) {
      var that = this

      // XXX: I copy these 4 lines from model to model - define proper
      // parent object and inherit all models from it
      if (!this.createdAt)
        this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      if (this.id === undefined) this.id = uuid.v4()

      this.updateHashedPassword(function() {
        async.parallel([
          function(done) {
            db.hmset('user:' + that.id,
                     { 'username': that.username.toString(),
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
          callback(that)
        })
      })
    },

    newPost: function(attrs, callback) {
      attrs.userId = this.id

      this.getPostsTimelineId(function(timelineId) {
        attrs.timelineId = timelineId

        callback(new models.Post(attrs))
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
      this.getTimelinesIds(function(timelines) {
        if (timelines['RiverOfNews']) {
          callback(timelines['RiverOfNews'])
        } else {
          // somehow this user has deleted its main timeline - let's
          // recreate from the scratch
          var timelineId = uuid.v4();
          db.hset('user:' + that.id + ':timelines', 'RiverOfNews',
                  timelineId, function(err, res) {
                    db.hmset('timeline:' + timelineId,
                             { 'name': 'River of news',
                               'userId': that.id }, function(err, res) {
                                 callback(timelineId);
                               })
                  })
        }
      })
    },

    getRiverOfNews: function(callback) {
      if (this.riverOfNews) {
        callback(this.riverOfNews)
      } else {
        var that = this
        this.getRiverOfNewsId(function(timelineId) {
          models.Timeline.findById(timelineId, function(timeline) {
            that.riverOfNews = timeline
            callback(that.riverOfNews)
          })
        })
      }
    },

    // TODO: DRY - getRiverOfNews
    getPostsTimelineId: function(callback) {
      var that = this;
      this.getTimelinesIds(function(timelines) {
        if (timelines['Posts']) {
          callback(timelines['Posts'])
        } else {
          // somehow this user has deleted its main timeline - let's
          // recreate from the scratch
          var timelineId = uuid.v4();
          db.hset('user:' + that.id + ':timelines', 'Posts',
                  timelineId, function(err, res) {
                    db.hmset('timeline:' + timelineId,
                             { 'name': 'Posts',
                               'userId': that.id }, function(err, res) {
                                 callback(timelineId);
                               })
                  })
        }
      })
    },

    getPostsTimeline: function(callback) {
      if (this.postsTimeline) {
        callback(this.postsTimeline)
      } else {
        var that = this
        this.getPostsTimelineId(function(timelineId) {
          models.Timeline.findById(timelineId, function(timeline) {
            that.postsTimeline = timeline
            callback(that.postsTimeline)
          })
        })
      }
    },

    getTimelinesIds: function(callback) {
      if (this.timelinesIds) {
        callback(this.timelinesIds)
      } else {
        var that = this
        db.hgetall('user:' + this.id + ':timelines', function(err, timelinesIds) {
          that.timelinesIds = timelinesIds
          callback(that.timelinesIds)
        })
      }
    },

    getTimelines: function(callback) {
      if (this.timelines) {
        callback(this.timelines)
      } else {
        var that = this
        this.getTimelinesIds(function(timelinesIds) {
          async.map(Object.keys(timelinesIds), function(timelineId, callback) {
            callback(null, new models.Timeline(timelinesIds[timelineId]))
          }, function(err, timelines) {
            that.timelines = timelines
            callback(that.timelines)
          })
        })
      }
    },

    toJSON: function(callback) {
      callback({
        id: this.id,
        username: this.username
      })
    }

  }
  
  return User;
}
