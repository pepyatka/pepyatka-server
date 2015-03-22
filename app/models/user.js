var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')
  , crypto = require('crypto')
  , mkKey = require("../support/models").mkKey
  , RSS = require('rss')
  , _ = require("underscore");

var userK = "user";
var rssK = "rss";

exports.addModel = function(db) {
  function User(params) {
    this.id = params.id
    this.username = params.username || ""
    if (params.password)
      this.password = params.password // virtual attribute
    this.hashedPassword = params.hashedPassword
    this.salt = params.salt
    this.info = params.info

    if (parseInt(params.createdAt, 10))
      this.createdAt = parseInt(params.createdAt, 10)
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = parseInt(params.updatedAt, 10)

    this.type = "user"
  }

  User.getAttributes = function() {
    return ['id', 'username', 'subscriptions', 'subscribers', 'createdAt', 'updatedAt']
  }

  User.destroy = function(userId, callback) {
    callback(null)
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
          db.hsetnx('user:' + userId, 'type', 'user', function(err, res) {
            db.hsetnx('user:' + userId + ':info', 'screenName', 'anonymous', function(err, res) {
              returnAnon()
            })
          })
        })
      } else {
        returnAnon()
      }
    })
  }

  User.findOrCreateByUsername = function(username, callback) {
    // init new user if it doesn't exist yet
    var returnUser = function() {
      User.findByUsername(username, function(err, user) { callback(err, user); })
    }

    var userId = uuid.v4();
    db.setnx('username:' + username +':uid', userId, function(err, res) {
      if (res == 1) {
        db.hsetnx('user:' + userId, 'username', username, function(err, res) {
          db.hsetnx('user:' + userId, 'type', 'user', function(err, res) {
            returnUser()
          })
        })
      } else {
        returnUser()
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

      db.hgetall('user:' + userId + ':info', function(err, info) {
        attrs.id = userId
        attrs.info = info

        var newUser = new User(attrs)

        newUser.getTimelines({}, function(err, timelines) {
          newUser.timelines = timelines

          callback(err, newUser)
        })
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

    getSubscribers: function(f) {
      var subscriberIds = [];
      var result = [];

      this.getTimelines({start: 0}, function(err, timelines) {
        async.forEach(timelines, function(timeline, done1) {

          timeline.getSubscribers(function(err, subscribers) {

            async.forEach(subscribers, function(subscriber, done2) {
              if (subscriberIds.indexOf(subscriber.id) != -1) {
                done2(null);
              } else {
                subscriberIds.push(subscriber.id);
                result.push(subscriber);
                done2(err);
              }
            }, function(err) {
              done1(err);
            });
          });

        }, function(err) {
          f(err, result);
        });
      });
    },

    getStatistics: function(f) {
      models.Stats.findByUserId(this.id, f);
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

    create: function(callback) {
      var that = this

      this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      this.id = uuid.v4()

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
                               'hashedPassword': that.hashedPassword.toString(),
                               'type': that.type
                             }, function(err, res) {
                               done(err, res)
                             })
                  },
                  function(done) {
                    db.hmset('user:' + that.id + ':info',
                             { 'screenName': that.username.toString().trim()
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

    cleanRSS: function(nrss, f) {
      var user = this;

      this.getRss(function(err, rss) {
        if (err) {
          f(err);
        } else {
          var diff = _.difference(rss, nrss);
          if (diff.length != 0) {
            // TODO: Use RSS.removeUser.
            async.forEach(diff, function(url, done) {
              models.RSS.findByUrl(url, function(err, rss) {
                if (err) {
                  done(err);
                } else {
                  rss.removeUser(user.id, function(err, res) {
                    done(err);
                  });
                }
              });
            }, function(err) {
              db.del(mkKey([userK, user.id, rssK]), function(err, res) {
                f(err);
              });
            });
          } else {
            f(false, null);
          }
        }
      });
    },

    update: function(params, callback) {
      var that = this

      this.updatedAt = new Date().getTime()

      this.validate(function(valid) {
        if (valid) {
          db.exists('user:' + that.id, function(err, res) {
            if (res !== 0) {
              async.parallel([
                function(done) {
                  that.cleanRSS(params.rss, function(err, res) {
                    if (params.rss) {
                      async.map(params.rss, function(url, done) {
                        models.RSS.addUserOrCreate({
                          url: url,
                          userId: that.id
                        }, function(err, rss) {
                          if (!err && rss) {
                            done(err, rss.url);
                          } else {
                            done(err, null);
                          }
                        });
                      }, function(err, res) {
                        if (!err && res) {
                          db.sadd(mkKey([userK, that.id, rssK]), res, function(err, res) {
                            done(err, res);
                          });
                        } else {
                          done(err, null);
                        }
                      });
                    } else {
                      done(err, res);
                    }
                  });
                },
                function(done) {
                  db.hmset('user:' + that.id,
                           {
                             'updatedAt': that.updatedAt.toString()
                           }, function(err, res) {
                             done(err, res)
                           })
                },
                function(done) {
                  var screenName = params.screenName ? params.screenName.toString().trim() : ''
                  var email = params.email ? params.email.toString().trim() : ''
                  var receiveEmails = params.receiveEmails ? params.receiveEmails.toString().trim() : ''
                  var attrs = { 'screenName': screenName,
                                'email': email,
                                'receiveEmails': receiveEmails
                              }

                  for(var k in attrs)
                    if (!attrs[k])
                      delete attrs[k]
                    else
                      that.info[k] = attrs[k]

                  db.hmset('user:' + that.id + ':info',
                           attrs, function(err, res) {
                             done(err, res)
                           })
                }
              ], function(err, res) {
                callback(err, that)
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
                    // TODO: if this is a new user it has no stats yet
                    if (err || !stats) return callback(1, that)

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

    getRss: function(f) {
      db.smembers(mkKey([userK, this.id, rssK]), f);
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
      var subscritionFeedsIds = []

      this.getSubscriptions(function(err, subscriptions) {
        async.forEach(subscriptions, function(subscription, done) {
          if (subscritionFeedsIds.indexOf(subscription.userId) != -1)
            return done(err)

          subscritionFeedsIds.push(subscription.userId)
          done(err)
        },
        function(err) {
          callback(err, subscritionFeedsIds.length)
        })
      })
    },

    newPost: function(attrs, callback) {
      attrs.userId = this.id

      if (!attrs.timelineIds || !attrs.timelineIds[0])
        this.getPostsTimelineId(function(err, timelineId) {
          attrs.timelineIds = [timelineId];

          callback(err, new models.Post(attrs))
        })
      else
        callback(null, new models.Post(attrs))
    },

    // XXX: do not like the design of this method. I'd say better to
    // put it into Post model
    newComment: function(attrs) {
      attrs.userId = this.id

      return new models.Comment(attrs)
    },

    getWellKnownTimelineId: function(name, displayName, callback) {
      var that = this;
      this.getTimelinesIds(function(err, timelines) {
        if (timelines[name]) {
          callback(null, timelines[name])
        } else {
          // somehow this user has deleted its main timeline - let's
          // recreate from the scratch
          var timelineId = uuid.v4();
          db.hset('user:' + that.id + ':timelines', name,
              timelineId, function(err, res) {
                db.hmset('timeline:' + timelineId,
                    { 'name': displayName,
                      'userId': that.id }, function(err, res) {
                      callback(err, timelineId);
                    })
              })
        }
      })
    },

    getRiverOfNewsId: function(callback) {
      this.getWellKnownTimelineId('RiverOfNews', 'River of news', callback)
    },

    getHidesTimelineId: function(callback) {
      this.getWellKnownTimelineId('Hides', 'Hidden posts', callback)
    },

    getRiverOfNews: function(params, callback) {
      var that = this
      this.getRiverOfNewsId(function(err, riverOfNewsId) {
        if (err != null) callback(err)
        that.getHidesTimelineId(function(err, hidesTimelineId) {
          if (err != null) callback(err)
          models.Timeline.findById(riverOfNewsId, params, function(err, riverOfNewsTimeline) {
            if (err != null) callback(err)
            var hidesTimelineParams = {start: 0, num: 25}
            models.Timeline.findById(hidesTimelineId, hidesTimelineParams, function(err, hidesTimeline) {
              if (err != null) callback(err)
              hidesTimeline.getPostsIds(0, 30, function(err, hiddenPostIds) {
                if (err != null) callback(err)
                riverOfNewsTimeline.getPosts(riverOfNewsTimeline.start, riverOfNewsTimeline.num, function(err, posts) {
                  if (err != null) callback(err)
                  posts.forEach(function (post) {
                    if (hiddenPostIds.indexOf(post.id) >= 0) {
                      post.isHidden = true
                    }
                  });
                  callback(err, riverOfNewsTimeline)
                })
              })
            });
          })
        })
      })
    },

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

    getAdministratedFeeds: function(callback) {
      var that = this

      that.getSubscriptions(function(err, subscriptions) {
        var subscriptionUsersIds = []
        var administratedFeeds = []

        async.forEach(subscriptions, function(subscription, callback) {
          if (subscriptionUsersIds.indexOf(subscription.userId) != -1)
            return callback(null)

          subscriptionUsersIds.push(subscription.userId)
          models.FeedFactory.findById(subscription.userId, function(err, feed) {
            if (feed.type != 'group')
              return callback(null)

            feed.getAdministratorsIds(function(err, administratorIds) {
              if (administratorIds.indexOf(that.id) == -1)
                return callback(null)

              administratedFeeds.push(feed)
              callback(err)
            })
          })
        },
        function(err) {
          callback(err, administratedFeeds)
        })
      })
    },

    getInfo: function(callback) {
      var that = this
      db.hgetall('user:' + that.id + ':info', function(err, items) {
        callback(err, items)
      })
    },

    genericPostsWComments: function(options, f) {
      this["get" + options.name + "Timeline"]({}, function(err, timeline) {
        if (err) {
          f(err, null);
        } else {
          //TODO: Add support for start/end in options.
          timeline.getPosts(0,25, function(err, posts) {
            async.map(posts, function(post, done) {
              // NOTE: Function getComments is impure and mutates
              // object therefore i don't need second argument of following
              // callback
              post.getComments(function(err, _) {
                done(err);
              });
            }, function(err, _) {
              f(err, posts);
            });
          });
        }
      });
    },

    getPostsTimelinePosts: function(f) {
      this.genericPostsWComments({name: "Posts"}, f);
    },

    getCommentsTimelineComments: function(f) {
      this.genericPostsWComments({name: "Comments"}, f);
    },

    getLikesTimelineLikes: function(f) {
      this.genericPostsWComments({name: "Likes"}, f);
    },

    toRss: function(params, f) {
      var attrs = {};
      var user = this;
      var select = params.select || models.User.getAttributes();
      var jobs = [];
      var callback = function(type, getter) {
        return function(done) {
          user[getter](function(err, res) {
            attrs[type] = res;
            done();
          });
        };
      };

      if (select.indexOf("info") != -1)     jobs.push(callback("info", "getInfo"));
      if (select.indexOf("posts") != -1)    jobs.push(callback("posts", "getPostsTimelinePosts"));
      if (select.indexOf("comments") != -1) jobs.push(callback("posts", "getCommentsTimelineComments"));
      if (select.indexOf("likes") != -1)    jobs.push(callback("posts", "getLikesTimelineLikes"));

      async.parallel(jobs, function(err, res) {
        if (err) {
          f(true, null);
        } else {
          var title = attrs["info"] ? attrs["info"].screenName : user.username;
          var feed = new RSS({
            title: title,
            description: title + " feed",
            site_url: params.siteUrl
          });

          attrs["posts"].forEach(function(post) {
            feed.item({
              title: post.body,
              description: post.comments[0] ? post.comments[0].body : null,
              guid: post.id,
              date: new Date(post.createdAt)
            });
          });

          f(null, feed);
        }
      });
    }
  }

  return User;
}
