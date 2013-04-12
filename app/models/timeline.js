var models = require('../models')
  , async = require('async')
  , redis = require('redis')
  , _ = require('underscore')
  , uuid = require('node-uuid')

exports.addModel = function(db) {
  function Timeline(params) {
    this.id = params.id
    this.name = params.name
    this.userId = params.userId

    this.start = parseInt(params.start, 10) || 0
    this.num = parseInt(params.num, 10) || 25
  }

  Timeline.getAttributes = function() {
    return ['id', 'user', 'posts']
  }

  Timeline.findById = function(timelineId, params, callback) {
    db.hgetall('timeline:' + timelineId, function(err, attrs) {
      if (!attrs || err)
        return callback(1, null)

      attrs.id = timelineId
      attrs.start = params.start
      attrs.num = params.num

      callback(err, new Timeline(attrs))
    })
  }

  Timeline.updatePost = function(timelineId, postId, callback) {
    var currentTime = new Date().getTime()
    db.zadd('timeline:' + timelineId + ':posts', currentTime, postId, function(err, res) {
      db.sadd('post:' + postId + ':timelines', timelineId, function(err, res) {
        db.hset('post:' + postId, 'updatedAt', currentTime, function(err, res) {
          callback(err, res)
        })
      })
    })
  }

  Timeline.getEveryoneTimeline = function(params, callback) {
    Timeline.getEveryoneTimelineId(function(err, timelineId) {
      Timeline.findById(timelineId, params, function(err, timeline) {
        return callback(err, timeline)
      })
    })
  }

  Timeline.getEveryoneTimelineId = function(callback) {
    var everyoneId = 'everyone'
    db.exists('timeline:' + everyoneId, function(err, res) {
      if (res === 1) return callback(err, everyoneId)

      db.hmset('timeline:' + everyoneId,
                 { 'name': 'Posts' }
               , function(err, res) {
                 callback(err, everyoneId)
               })
    })
  }

  Timeline.newPost = function(postId, callback) {
    var currentTime = new Date().getTime()

    models.Post.findById(postId, function(err, post) {
      post.getSubscribedTimelinesIds(function(err, timelinesIds) {
        // we add everyoneTimelineId to timelineIds, and newPost will
        // be put in everyone timeline
        Timeline.getEveryoneTimelineId(function(err, everyoneTimelineId) {
          timelinesIds.push(everyoneTimelineId)

          var pub = redis.createClient();

          async.forEach(timelinesIds, function(timelineId, callback) {
            db.zadd('timeline:' + timelineId + ':posts', currentTime, postId, function(err, res) {
              db.hset('post:' + postId, 'updatedAt', currentTime, function(err, res) {
                db.sadd('post:' + postId + ':timelines', timelineId, function(err, res) {
                  pub.publish('newPost', JSON.stringify({ postId: postId,
                    timelineId: timelineId }))

                  callback(err)
                })
              })
            })
          }, function(err) {
            callback(err)
          })
        })
      })
    })
  }

  Timeline.prototype = {
    getSubscribersIds: function(callback) {
      if (this.subscribersIds)
        return callback(null, this.subscribersIds)

      var that = this
      db.zrevrange('timeline:' + this.id + ':subscribers', 0, -1, function(err, subscribersIds) {
        that.subscribersIds = subscribersIds || []
        callback(err, that.subscribersIds)
      })
    },

    getSubscribers: function(callback) {
      if (this.subscribers)
        return callback(null, this.subscribers)

      var that = this
      this.getSubscribersIds(function(err, subscribersIds) {
        async.map(Object.keys(subscribersIds), function(subscriberId, callback) {
          models.User.findById(subscribersIds[subscriberId], function(err, subscriber) {
            callback(err, subscriber)
          })
        }, function(err, subscribers) {
          that.subscribers = subscribers.compact()
          callback(err, that.subscribers)
        })
      })
    },

    getPostsIds: function(start, num, callback) {
      if (this.postsIds)
        return callback(null, this.postsIds)

      var that = this
      db.zrevrange('timeline:' + this.id + ':posts', start, start+num-1, function(err, postsIds) {
        that.postsIds = postsIds || []
        callback(err, that.postsIds)
      })
    },

    getPosts: function(start, num, callback) {
      if (this.posts)
        return callback(null, this.posts)

      var that = this
      this.getPostsIds(start, num, function(err, postsIds) {
        async.map(postsIds, function(postId, callback) {
          models.Post.findById(postId, function(err, post) {
            callback(err, post)
          })
        }, function(err, posts) {
          that.posts = posts
          callback(err, that.posts)
        })
      })
    },

    // Not used
    getUsersIds: function(callback) {
      if (this.usersIds)
        return callback(null, this.usersIds)

      var that = this;
      db.lrange('timeline:' + this.id + ':users', 0, -1, function(err, usersIds) {
        that.usersIds = usersIds || []
        callback(err, that.usersIds)
      })
    },

    // Not used
    getUsers: function(callback) {
      if (this.users)
        return callback(null, this.users)

      var that = this
      this.getUsersIds(function(err, usersIds) {
        async.map(usersIds, function(userId, callback) {
          models.User.findById(userId, function(err, user) {
            callback(err, user)
          })
        }, function(err, users) {
          that.users = users
          callback(err, that.users)
        })
      })
    },

    getPostsCount: function(callback) {
      db.zcount('timeline:' + this.id + ':posts', '-inf', '+inf', function(err, res){
        callback(err, res)
      })
    },

    toJSON: function(params, callback) {
      var that = this
        , json = {}
        , select = params.select ||
            models.Timeline.getAttributes()

      if (select.indexOf('id') != -1)
        json.id = that.id

      if (select.indexOf('name') != -1)
        json.name = that.name

      if (select.indexOf('userId') != -1)
        json.userId = that.userId

      if (select.indexOf('user') != -1) {
        models.FeedFactory.findById(that.userId, function(err, feed) {
          var fn = function() {
            if (select.indexOf('posts') != -1) {
              that.getPosts(that.start, that.num, function(err, posts) {
                async.map(posts, function(post, callback) {
                  post.toJSON(params.posts || {}, function(err, json) {
                    callback(err, json)
                  })
                }, function(err, postsJSON) {
                  json.posts = postsJSON

                  if (select.indexOf('subscribers') != -1) {
                    that.getSubscribers(function(err, subscribers) {
                      async.map(subscribers, function(subscriber, callback) {
                        subscriber.toJSON(params.subscribers || {}, function(err, json) {
                          callback(err, json)
                        })
                      }, function(err, subscribersJSON) {
                        json.subscribers = subscribersJSON

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
          }

          // most likely this is everyone timeline
          if (feed === null)
            return fn()

          feed.toJSON(params.user || {}, function(err, userJSON) {
            json.user = userJSON

            fn()
          })
        })
      } else {
        callback(null, json)
      }
    }
  }
  
  return Timeline;

}
