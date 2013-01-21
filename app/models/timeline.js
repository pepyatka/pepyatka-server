var models = require('../models')
  , async = require('async')
  , redis = require('redis')

exports.addModel = function(db) {
  var POSTS = 25

  function Timeline(params) {
    this.id = params.id
    this.name = params.name
    this.userId = params.userId
  }

  Timeline.findById = function(timelineId, callback) {
    db.hgetall('timeline:' + timelineId, function(err, attrs) {
      if (attrs) {
        attrs.id = timelineId

        callback(err, new Timeline(attrs))
      } else {
        callback(err, null)
      }
    })
  }

  // If user updates timeline we need to
  Timeline.update = function(timelineId, callback) {
    db.zrevrange('timeline:' + timelineId + ':posts', POSTS, -1, function(err, posts) {
      async.forEach(posts, function(postId, callback) {
        models.Post.destroy(postId, function(err, res) {        
          callback(err)
        })
      }, function(err) {
        callback(err)
      })
    })
  }

  Timeline.updatePost = function(timelineId, postId, callback) {
    var currentTime = new Date().getTime()
    db.zadd('timeline:' + timelineId + ':posts', currentTime, postId, function(err, res) {
      db.hset('post:' + postId, 'updatedAt', currentTime, function(err, res) {
        callback(err, res)
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
          timelinesIds.push(timelineId)

          async.forEach(timelinesIds, function(timelineId, callback) {
            db.zadd('timeline:' + timelineId + ':posts', currentTime, postId, function(err, res) {
              Timeline.update(post.timelineId, function(err) {
                db.hset('post:' + postId, 'updatedAt', currentTime, function(err, res) {
                  db.sadd('post:' + postId + ':timelines', timelineId, function(err, res) {
                    callback(err, res)
                  })
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
    toJSON: function(callback) {
      var that = this;

      this.getPosts(function(err, posts) {
        async.map(posts, function(post, callback) {
          post.toJSON(function(err, json) {
            callback(err, json)
          })
        }, function(err, postsJSON) {
          models.User.findById(that.userId, function(err, user) {
            user.toJSON(function(err, user) {
              callback(err, {
                user: user,
                posts: postsJSON
              })
            })
          })
        })
      })
    },

    getPostsIds: function(callback) {
      if (this.postsIds) {
        callback(null, this.postsIds)
      } else {
        var that = this
        db.zrevrange('timeline:' + this.id + ':posts', 0, POSTS-1, function(err, postsIds) {
          that.postsIds = postsIds || []
          callback(err, that.postsIds)
        })
      }
    },

    getPosts: function(callback) {
      if (this.posts) {
        callback(null, this.posts)
      } else {
        var that = this
        this.getPostsIds(function(err, postsIds) {
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
    }
  }
  
  return Timeline;

}
