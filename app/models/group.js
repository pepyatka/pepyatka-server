var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')
  , util = require('util')
  , crypto = require('crypto')

exports.addModel = function(db) {
  function Group(params) {
//    Group.super_.call(this, params);
    this.id = params.id
    this.username = params.username
    this.createdAt = params.createdAt
    this.updatedAt = params.updatedAt
    this.type = "group"
  }

  util.inherits(Group, models.User)

  Group.findById = function(userId, callback) {
    db.hgetall('user:' + userId, function(err, attrs) {
      if (attrs === null)
        return callback(1, null)

      attrs.id = userId
      var newGroup = new Group(attrs)

      callback(err, newGroup)
    })
  }

  Group.destroy = function(userId, callback) {
    var destroyAllPosts = function(user, callback) {
      user.getPostsTimeline({start: 0}, function(err, timeline) {
        if (err)
          return callback(err)

        var deletePartOfPosts = function(start, count) {
          timeline.getPostsIds(start, count, function(err, postsIds) {
            if (err)
              return callback(err)

            async.forEach(postsIds, function(postId, done) {
                models.Post.destroy(postId, function(err) {
                  done(err)
                })
              },
              function(err) {
                if (postsIds.length < 25)
                  return callback(err)

                deletePartOfPosts(start + count, count)
              })
          })
        }(0, 25)
      })
    }

    var unsubscribeAllUsers = function(user, callback) {
      user.getPostsTimeline({start: 0}, function(err, timeline) {
        if (err)
          return callback(err)

        timeline.getSubscribers(function(err, subscribers) {
          if (err)
            return callback(err)

          async.forEach(subscribers, function(subscriber, done) {
              subscriber.unsubscribeTo(timeline.id, function(err) {
                done(err)
              })
            },
            function(err) {
              callback(err)
            })
        })
      })
    }

    var destroyAllTimelines = function(user, callback) {
      user.getTimelinesIds(function(err, timelinesIds) {
        if (err)
          return callback(err)

        var ids = []
        for (var id in timelinesIds) {
          ids.push(timelinesIds[id])
        }

        async.forEach(ids, function(timelineId, done) {
          db.keys('timeline:' + timelineId + '*', function(err, keys) {
            async.forEach(keys, function(key, done) {
              db.del(key, function(err, res) {
                done(err)
              })
            }, function(err) {
              done(err)
            })
          })
        }, function(err) {
          callback(err)
        })
      })
    }

    var deleteStats = function(user, callback) {
      db.del('stats:' + user.id, function(err, res) {
        callback(err)
      })
    }

    var deleteUser = function(user, callback) {
      async.parallel([
        function(done) {
          db.keys('user:' + user.id + '*', function(err, keys) {
            async.forEach(keys, function(key, done) {
              db.del(key, function(err, res) {
                done(err)
              })
            },
            function(err) {
              done(err)
            })
          })
        },
        function(done) {
          db.del('username:' + user.username + ':uid', function(err, res) {
            done(err)
          })
        }],
        function(err) {
          callback(err)
        })
    }

    models.User.findById(userId, function(err, user) {
      if (err)
        return callback(err)

      unsubscribeAllUsers(user, function(err) {
        if (err)
          return callback(err)

        destroyAllPosts(user, function(err) {
          if (err)
            return callback(err)

          async.parallel([
            function(done) {
              destroyAllTimelines(user, function(err) {
                if (err)
                  return done(err)

                deleteUser(user, done)
              })
          },
          function(done) {
            deleteStats(user, done)
          }],
          function(err) {
            callback(err)
          })
        })
      })
    })
  }

  Group.prototype = {
    validate: function(callback) {
      var that = this

      async.parallel([
        function(done) {
          db.exists('user:' + this.id, function(err, groupExists) {
            done(err, groupExists === 0 &&
                     that.username.length > 1)
          })
        },
        function(done) {
          db.exists('username:' + that.username + ':uid', function(err, usernameExists) {
            done(err, usernameExists === 0 &&
              that.username.length > 1)
          })
        }],
        function(err, res) {
          callback(res.indexOf(false) == -1)
        })
    },

    create: function(callback) {
      var that = this

      this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      this.id = uuid.v4()

      this.validate(function(valid) {
        if (!valid)
          return callback(1, that)

        db.exists('user:' + that.id, function(err, res) {
          if (res !== 0)
            return callback(err, res)

          async.parallel([
            function(done) {
              db.hmset('user:' + that.id,
                { 'username': that.username,
                  'createdAt': that.createdAt.toString(),
                  'updatedAt': that.updatedAt.toString(),
                  'type': that.type
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
      })
    },

    update: function(callback) {
      var that = this

      this.updatedAt = new Date().getTime()

      this.validate(function(valid) {
        if (!valid)
          return callback(1, that)

        db.exists('user:' + that.id, function(err, res) {
          if (res !== 1)
            return callback(err, res)

          db.hmset('user:' + that.id,
            { 'username': that.username,
              'updatedAt': that.updatedAt.toString()
            }, function(err, res) {
              if (err)
                return callback(err, that)

              callback(null, that)
            })
        })
      })
    }
  }

  return Group;
}
