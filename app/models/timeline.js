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
      if (attrs) {
        attrs.id = timelineId
        attrs['start'] = params['start']
        attrs['num'] = params['num']

        callback(err, new Timeline(attrs))
      } else {
        callback(err, null)
      }
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
      models.User.findById(post.userId, function(err, user) {
        // TODO: save this postId to all connected timelines for all
        // subscribed users
        var timelinesIds = [post.timelineId]

        user.getRiverOfNewsId(function(err, timelineId) {
          var pub = redis.createClient();

          timelinesIds.push(timelineId)
          timelinesIds = _.uniq(timelinesIds)

          async.forEach(timelinesIds, function(timelineId, callback) {
            db.zadd('timeline:' + timelineId + ':posts', currentTime, postId, function(err, res) {
              db.hset('post:' + postId, 'updatedAt', currentTime, function(err, res) {
                db.sadd('post:' + postId + ':timelines', timelineId, function(err, res) {
                  pub.publish('newPost', JSON.stringify({ postId: postId,
                                                          timelineId: timelineId }))

                  callback(err, res)
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

    toJSON: function(params, callback) {
      var that = this
        , json = {}
        , select = params['select'] ||
            models.Timeline.getAttributes()

      if (select.indexOf('id') != -1)
        json.id = that.id

      if (select.indexOf('posts') != -1) {
        this.getPosts(this.start, this.num, function(err, posts) {
          async.map(posts, function(post, callback) {
            post.toJSON(params.posts || {}, function(err, json) {
              callback(err, json)
            })
          }, function(err, postsJSON) {
            json.posts = postsJSON

            if (select.indexOf('user') != -1) {
              models.User.findById(that.userId, function(err, user) {
                user.toJSON(params.user || {}, function(err, userJSON) {
                  json.user = userJSON

                  callback(err, json)
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
