var models = require('../models')
  , async = require('async')
  , redis = require('redis')
  , _ = require('underscore')

exports.addModel = function(db) {
  function Timeline(params) {
    this.id = params.id
    this.name = params.name
    this.userId = params.userId

    this.start = parseInt(params.start) || 0
    this.num = parseInt(params.num) || 25
  }

  Timeline.getAttributes = function() {
    return ['id', 'user', 'posts']
  }

  Timeline.findById = function(timelineId, params, callback) {
    db.hgetall('timeline:' + timelineId, function(err, attrs) {
      if (!attrs || err) {
        if (!err) err = 1

        callback(err, null)
        return
      }

      attrs.id = timelineId
      attrs['start'] = params['start']
      attrs['num'] = params['num']

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

  Timeline.newPost = function(postId, callback) {
    var currentTime = new Date().getTime()

    models.Post.findById(postId, function(err, post) {
      post.getSubscribedTimelinesIds(function(err, timelinesIds) {
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
  }

  Timeline.prototype = {
    getSubscribersIds: function(callback) {
      if (this.subscribersIds) {
        callback(null, this.subscribersIds)
      } else {
        var that = this
        db.zrevrange('timeline:' + this.id + ':subscribers', 0, -1, function(err, subscribersIds) {
          that.subscribersIds = subscribersIds || []
          callback(err, that.subscribersIds)
        })
      }
    },

    getSubscribers: function(callback) {
      if (this.subscribers) {
        callback(null, this.subscribers)
      } else {
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
      }
    },

    getPostsIds: function(start, num, callback) {
      if (this.postsIds) {
        callback(null, this.postsIds)
      } else {
        var that = this
        db.zrevrange('timeline:' + this.id + ':posts', start, start+num-1, function(err, postsIds) {
          that.postsIds = postsIds || []
          callback(err, that.postsIds)
        })
      }
    },

    getPosts: function(start, num, callback) {
      if (this.posts) {
        callback(null, this.posts)
      } else {
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
      }
    },

    // Not used
    getUsersIds: function(callback) {
      if (this.usersIds) {
        callback(null, this.usersIds)
      } else {
        var that = this;
        db.lrange('timeline:' + this.id + ':users', 0, -1, function(err, usersIds) {
          that.usersIds = usersIds || []
          callback(err, that.usersIds)
        })
      }
    },

    // Not used
    getUsers: function(callback) {
      if (this.users) {
        callback(null, this.users)
      } else {
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
      }
    },

    getPostsCount: function(callback) {
      db.zcount('timeline:' + this.id + ':posts', '-inf', '+inf', function(err, res){
        callback(err, res)
      })
    },

    toJSON: function(params, callback) {
      var that = this
        , json = {}
        , select = params['select'] ||
            models.Timeline.getAttributes()

      if (select.indexOf('id') != -1)
        json.id = that.id

      if (select.indexOf('name') != -1)
        json.name = that.name

      if (select.indexOf('userId') != -1)
        json.userId = that.userId

      if (select.indexOf('user') != -1) {
        models.User.findById(that.userId, function(err, user) {
          user.toJSON(params.user || {}, function(err, userJSON) {
            json.user = userJSON

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
          })
        })
      } else {
        callback(null, json)
      }
    }
  }
  
  return Timeline;

}
