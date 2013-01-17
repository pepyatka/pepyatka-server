var models = require('../models')
  , async = require('async')
  , redis = require('redis')
  , logger = require('../../logger').create()

exports.addModel = function(db) {
  var POSTS = 25

  function Timeline(params) {
    logger.debug('new Timeline(' + params + ')')

    var that = this;

    this.id = params.id
    this.name = params.name
    this.userId = params.userId
  }

  Timeline.findById = function(timelineId, callback) {
    logger.debug('Timeline.findById("' + timelineId + '")')

    db.hgetall('timeline:' + timelineId, function(err, attrs) {
      if (attrs) {
        attrs.id = timelineId

        callback(new Timeline(attrs))
      } else {
        callback(null)
      }
    })
  }

  // If user updates timeline we need to
  Timeline.update = function(timelineId, callback) {
    logger.debug('Timeline.update("' + timelineId + '")')
    db.zrevrange('timeline:' + timelineId + ':posts', POSTS, -1, function(err, posts) {
      async.forEach(posts, function(postId, callback) {
        models.Post.destroy(postId, function(err, res) {        
          callback(err)
        })
      }, function(err) {
        callback()
      })
    })
  }

  Timeline.updatePost = function(timelineId, postId, callback) {
    logger.debug('Timeline.updatePost("' + timelineId + '", "' + postId + '")')
    var currentTime = new Date().getTime()
    db.zadd('timeline:' + timelineId + ':posts', currentTime, postId, function(err, res) {
      db.hset('post:' + postId, 'updatedAt', currentTime, function(err, res) {
        callback()
      })
    })
  }

  Timeline.newPost = function(timelineId, postId, callback) {
    logger.debug('Timeline.newPost("' + timelineId + '", "' + postId + '")')
    var currentTime = new Date().getTime()
    db.zadd('timeline:' + timelineId + ':posts', currentTime, postId, function(err, res) {
      Timeline.update(timelineId, function() {
        // TODO: -> Post.update() ?
        db.hset('post:' + postId, 'updatedAt', currentTime, function(err, res) {
          callback()
        })
      })
    })
  }

  // Timeline.posts = function(userId, callback) {
  //   logger.debug('Timeline.posts("' + userId + '")')
  //   db.zrevrange('timeline:' + userId + ':posts', 0, POSTS-1, function(err, posts) {
  //     async.map(posts, function(postId, callback) {
  //       models.Post.findById(postId, function(post) {
  //         callback(null, post)
  //       })
  //     }, function(err, posts) {
  //       callback(posts)
  //     })
  //   })
  // }

  Timeline.prototype = {
    toJSON: function(callback) {
      logger.debug("- timeline.toJSON()")
      var that = this;

      this.getPosts(function(posts) {
        async.map(posts, function(post, callback) {
          post.toJSON(function(json) {
            callback(null, json)
          })
        }, function(err, postsJSON) {
          models.User.findById(that.userId, function(user) {
            user.toJSON(function(user) {
              callback({
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
        callback(this.postsIds)
      } else {
        db.zrevrange('timeline:' + this.id + ':posts', 0, POSTS-1, function(err, postsIds) {
          this.postsIds = postsIds
          callback(postsIds)
        })
      }
    },

    getPosts: function(callback) {
      if (this.posts) {
        callback(this.posts)
      } else {
        this.getPostsIds(function(postsIds) {
          async.map(postsIds, function(postId, callback) {
            models.Post.findById(postId, function(post) {
              callback(null, post)
            })
          }, function(err, posts) {
            this.posts = posts || []
            callback(posts)
          })
        })
      }
    },

    getUsers: function(callback) {
      logger.debug('- timeline.getUsers()')

      db.lrange('timeline:' + this.id + ':users', 0, -1, function(err, users) {
        async.map(users, function(userId, callback) {
          models.User.findById(userId, function(user) {
            callback(null, user)
          })
        }, function(err, users) {
          callback(users)
        })
      })
    }
  }
  
  return Timeline;

}
