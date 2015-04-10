var Promise = require('bluebird')
  , models = require('./models')
  , async = require('async')
  , redis = require('redis').createClient

exports.init = function(database) {
  "use strict";

  var pubSub = function() {
  }

  pubSub.newPost = function(postId) {
    return new Promise(function(resolve, reject) {
      models.Post.findById(postId)
        .then(function(post) { return post.getSubscribedTimelineIds() })
        .then(function(timelineIds) {
          return Promise.map(timelineIds, function(timelineId) {
            database.publishAsync('newPost',
                                  JSON.stringify({
                                    postId: postId,
                                    timelineId: timelineId
                                  }))
          })
        })
        .then(function(res) { resolve(res) })
    })
  }

  pubSub.destroyPost = function(postId) {
    return new Promise(function(resolve, reject) {
      models.Post.findById(postId)
        .then(function(post) { return post.getSubscribedTimelineIds() })
        .then(function(timelineIds) {
          return Promise.map(timelineIds, function(timelineId) {
            database.publishAsync('destroyPost',
                                  JSON.stringify({
                                    postId: postId,
                                    timelineId: timelineId
                                  }))
          })
        })
        .then(function(res) { resolve(res) })
    })
  }

  pubSub.updatePost = function(postId) {
    return new Promise(function(resolve, reject) {
      models.Post.findById(postId)
        .then(function(post) { return post.getSubscribedTimelineIds() })
        .then(function(timelineIds) {
          return Promise.map(timelineIds, function(timelineId) {
            database.publishAsync('updatePost',
                                  JSON.stringify({
                                    postId: postId,
                                    timelineId: timelineId
                                  }))
          })
        })
        .then(function(res) { resolve(res) })
    })
  }

  pubSub.newComment = function(commentId) {
    return new Promise(function(resolve, reject) {
      models.Comment.findById(commentId).bind({})
        .then(function(comment) {
          this.comment = comment
          return comment.getPost()
        })
        .then(function(post) {
          this.post = post
          return post.getCommentsFriendOfFriendTimelines(this.comment.userId)
        })
        .then(function(timelines) {
          return Promise.map(timelines, function(timeline) {
            database.publishAsync('newComment',
                                  JSON.stringify({
                                    timelineId: timeline.id,
                                    commentId: commentId
                                  }))
          })
        })
        .then(function() {
          return database.publishAsync('newComment',
                                       JSON.stringify({
                                         postId: this.post.id,
                                         commentId: commentId
                                       }))
        })
        .then(function(res) { resolve(res) })
    })
  }

  pubSub.destroyComment = function(commentId) {
    return new Promise(function(resolve, reject) {
      models.Comment.findById(commentId).bind({})
        .then(function(comment) {
          this.comment = comment
          return comment.getPost()
        })
        .then(function(post) {
          this.post = post
          return database.publishAsync('destroyComment',
                                JSON.stringify({
                                  postId: post.id,
                                  commentId: this.comment.id
                                }))
        })
        .then(function(res) { resolve(res) })
    })
  }

  pubSub.updateComment = function(commentId) {
    return new Promise(function(resolve, reject) {
      models.Comment.findById(commentId).bind({})
        .then(function(comment) {
          this.comment = comment
          return comment.getPost()
        })
        .then(function(post) {
          this.post = post
          return database.publishAsync('updateComment',
                                       JSON.stringify({
                                         postId: post.id,
                                         commentId: this.comment.id
                                       }))
        })
        .then(function() { return this.post.getSubscribedTimelineIds() })
        .then(function(timelineIds) {
          return Promise.map(timelineIds, function(timelineId) {
            database.publishAsync('updateComment',
                                  JSON.stringify({
                                    timelineId: timelineId,
                                    commentId: commentId
                                  }))
          })
        })
        .then(function(res) { resolve(res) })
    })
  }

  pubSub.newLike = function(postId, userId) {
    return new Promise(function(resolve, reject) {
      models.Post.findById(postId).bind({})
        .then(function(post) {
          this.post = post
          return post.getLikesFriendOfFriendTimelines(userId)
        })
        .then(function(timelines) {
          return Promise.map(timelines, function(timeline) {
            return database.publishAsync('newLike',
                                  JSON.stringify({
                                    timelineId: timeline.id,
                                    userId: userId,
                                    postId: postId
                                  }))

          })
        })
        .then(function() {
          return database.publishAsync('newLike',
                                       JSON.stringify({
                                         userId: userId,
                                         postId: postId
                                       }))
        })
        .then(function(res) { resolve(res) })
    })
  }

  pubSub.removeLike = function(postId, userId) {
    return new Promise(function(resolve, reject) {
      models.Post.findById(postId).bind({})
        .then(function(post) {
          this.post = post
          return post.getSubscribedTimelineIds()
        })
        .then(function(timelineIds) {
          return Promise.map(timelineIds, function(timelineId) {
            return database.publishAsync('removeLike',
                                  JSON.stringify({
                                    timelineId: timelineId,
                                    userId: userId,
                                    postId: postId
                                  }))
          })
        })
        .then(function() {
          return database.publishAsync('removeLike',
                                       JSON.stringify({
                                         userId: userId,
                                         postId: postId
                                       }))
        })
        .then(function(res) { resolve(res) })
    })
  }

  pubSub.hidePost = function(userId, postId) {
    return new Promise(function(resolve, reject) {
      models.User.findById(userId).bind({})
        .then(function(user) { return user.getRiverOfNewsTimelineId() })
        .then(function(riverOfNewsId) {
          return database.publishAsync('hidePost',
                                       JSON.stringify({
                                         timelineId: riverOfNewsId,
                                         postId: postId
                                       }))
        })
        .then(function(res) { resolve(res) })
    })
  }

  pubSub.unhidePost = function(userId, postId) {
    return new Promise(function(resolve, reject) {
      models.User.findById(userId).bind({})
        .then(function(user) { return user.getRiverOfNewsTimelineId() })
        .then(function(riverOfNewsId) {
          return database.publishAsync('unhidePost',
                                       JSON.stringify({
                                         timelineId: riverOfNewsId,
                                         postId: postId
                                       }))
        })
        .then(function(res) { resolve(res) })
    })
  }

  pubSub.listen = function(server, app) {
    var io = require('socket.io')(server)

    var adapter = require('socket.io-redis')
     , redisPub = redis()
     , redisSub = redis({ detect_buffers: true })

    io.adapter(adapter({
      pubClient: redisPub,
      subClient: redisSub
    }))

    io.sockets.on('connection', function(socket) {
      socket.on('subscribe', function(data) {
        for(var channel in data) {
          if (data[channel]) {
            data[channel].forEach(function(id) {
              if (id) {
                app.logger.info('User has subscribed to ' + id + ' ' + channel)

                socket.join(channel + ':' + id)
              }
            })
          }
        }
      })

      socket.on('unsubscribe', function(data) {
        for(var channel in data) {
          if (data[channel]) {
            data[channel].forEach(function(id) {
              if (id) {
                app.logger.info('User has disconnected from ' + id + ' ' + channel)

                socket.leave(channel + ':' + id)
              }
            })
          }
        }
      })
    })

    var channels = redis()
    channels.subscribe('newPost', 'destroyPost', 'updatePost',
                       'newComment', 'destroyComment', 'updateComment',
                       'newLike', 'removeLike', 'hidePost', 'unhidePost' )

    // TODO: extract to separate functions
    channels.on('message', function(channel, msg) {
      switch(channel) {
      case 'destroyPost':
        var data = JSON.parse(msg)
        var event = { postId: data.postId }

        io.sockets.in('timeline:' + data.timelineId).emit('destroyPost', event)
        io.sockets.in('post:' + data.postId).emit('destroyPost', event)

        break

      case 'newPost':
      var data = JSON.parse(msg)

        models.Post.findById(data.postId)
          .then(function(post) {
            new models.PostSerializer(post).toJSON(function(err, json) {
              io.sockets.in('timeline:' + data.timelineId).emit('newPost', { post: json })
            })
          })

        break

      case 'updatePost':
        var data = JSON.parse(msg)

        models.Post.findById(data.postId)
          .then(function(post) {
            new models.PostSerializer(post).toJSON(function(err, json) {
              io.sockets.in('timeline:' + data.timelineId).emit('updatePost', json)
              io.sockets.in('post:' + data.postId).emit('updatePost', json)
            })
          })

        break

      case 'newComment':
        var data = JSON.parse(msg)

        models.Comment.findById(data.commentId)
          .then(function(comment) {
            new models.PubsubCommentSerializer(comment).toJSON(function(err, json) {
              if (data.timelineId) {
                io.sockets.in('timeline:' + data.timelineId).emit('newComment', json)
              } else {
                io.sockets.in('post:' + data.postId).emit('newComment', json)
              }
            })
          })

        break

      case 'updateComment':
        var data = JSON.parse(msg)

        models.Comment.findById(data.commentId)
          .then(function(comment) {
            new models.PubsubCommentSerializer(comment).toJSON(function(err, json) {
              if (data.timelineId) {
                io.sockets.in('timeline:' + data.timelineId).emit('updateComment', json)
              } else {
                io.sockets.in('post:' + data.postId).emit('updateComment', json)
              }
            })
          })

        break

      case 'destroyComment':
        var data = JSON.parse(msg)
        var event = { postId: data.postId, commentId: data.commentId }

        io.sockets.in('post:' + data.postId).emit('destroyComment', event)

        models.Post.findById(data.postId)
          .then(function(post) {
            return post.getTimelineIds()
          })
          .then(function(timelineIds) {
            return Promise.map(timelineIds, function(timelineId) {
              return io.sockets.in('timeline:' + timelineId).emit('destroyComment', event)
            })
          })

        break

      case 'newLike':
        var data = JSON.parse(msg)

        models.User.findById(data.userId)
          .then(function(user) {
            new models.LikeSerializer(user).toJSON(function(err, json) {
              var event = json
              event.meta = { postId: data.postId }

              if (data.timelineId) {
                io.sockets.in('timeline:' + data.timelineId).emit('newLike', event)
              } else {
                io.sockets.in('post:' + data.postId).emit('newLike', event)
              }
            })
          })

        break

      case 'removeLike':
        var data = JSON.parse(msg)
        var event = { meta: { userId: data.userId, postId: data.postId } }

        if (data.timelineId)
          io.sockets.in('timeline:' + data.timelineId).emit('removeLike', event)
        else
          io.sockets.in('post:' + data.postId).emit('removeLike', event)

        break

      case 'hidePost':
        // NOTE: posts are hidden only on RiverOfNews timeline so this
        // event won't leak any personal information
        var data = JSON.parse(msg)
        var event = { meta: { postId: data.postId } }
        io.sockets.in('timeline:' + data.timelineId).emit('hidePost', event)

        break

      case 'unhidePost':
        // NOTE: posts are hidden only on RiverOfNews timeline so this
        // event won't leak any personal information
        var data = JSON.parse(msg)
        var event = { meta: { postId: data.postId } }
        io.sockets.in('timeline:' + data.timelineId).emit('unhidePost', event)

        break
      }
    })
  }

  return pubSub
}
