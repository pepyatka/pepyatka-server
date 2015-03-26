var Promise = require('bluebird')
  , models = require('./models')
  , async = require('async')
  , redis = require('redis').createClient
  , PostSerializer = models.PostSerializer
  , CommentSerializer = models.CommentSerializer
  , LikeSerializer = models.LikeSerializer

exports.listen = function(server, app) {
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
          new PostSerializer(post).toJSON(function(err, json) {
            io.sockets.in('timeline:' + data.timelineId).emit('newPost', { post: json })
          })
        })

      break

    case 'updatePost':
      var data = JSON.parse(msg)

      models.Post.findById(data.postId)
        .then(function(post) {
          new PostSerializer(post).toJSON(function(err, json) {
            var event = { post: json }

            io.sockets.in('timeline:' + data.timelineId).emit('updatePost', event)
            io.sockets.in('post:' + data.postId).emit('updatePost', event)
          })
        })

      break

    case 'newComment':
      var data = JSON.parse(msg)

      models.Comment.findById(data.commentId)
        .then(function(comment) {
          new CommentSerializer(comment).toJSON(function(err, json) {
            var event = { comment: json }

            if (data.timelineId) {
              io.sockets.in('timeline:' + data.timelineId).emit('newComment', event)
            } else {
              io.sockets.in('post:' + data.postId).emit('newComment', event)
            }
          })
        })

      break

    case 'updateComment':
      var data = JSON.parse(msg)

      models.Comment.findById(data.commentId)
        .then(function(comment) {
          new CommentSerializer(comment).toJSON(function(err, json) {
            var event = { comment: json }

            if (data.timelineId) {
              io.sockets.in('timeline:' + data.timelineId).emit('updateComment', event)
            } else {
              io.sockets.in('post:' + data.postId).emit('updateComment', event)
            }
          })
        })

      break

    case 'destroyComment':
      var data = JSON.parse(msg)
      var event = { postId: data.postId, commentId: data.commentId }

      io.sockets.in('post:' + data.postId).emit('destroyComment', event)

      models.Post.findById(data.postId)
        .then(function(post) { return post.getTimelineIds() })
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
          new LikeSerializer(user).toJSON(function(err, json) {
            var event = { user: json, postId: data.postId }

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
      var event = { userId: data.userId, postId: data.postId }

      if (data.timelineId)
        io.sockets.in('timeline:' + data.timelineId).emit('removeLike', event)
      else
        io.sockets.in('post:' + data.postId).emit('removeLike', event)

      break

    case 'hidePost':
      var data = JSON.parse(msg)
      var event = { userId: data.userId, postId: data.postId }
      io.sockets.in('timeline:' + data.timelineId).emit('hidePost', event)

      break

    case 'unhidePost':
      var data = JSON.parse(msg)
      var event = { userId: data.userId, postId: data.postId }
      io.sockets.in('timeline:' + data.timelineId).emit('unhidePost', event)

      break
    }
  })
}
