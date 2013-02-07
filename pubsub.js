var models = require('./app/models')
  , redis = require('redis')

exports.listen = function(server) {
  var io = require('socket.io').listen(server)

  io.configure('production', function() {
    io.enable('browser client etag');
    io.enable('browser client minification');
    io.enable('browser client gzip');

    io.set('log level', 1);

    io.set('transports', [
        'websocket'
      , 'flashsocket'
      , 'htmlfile'
      , 'xhr-polling'
      , 'jsonp-polling'
    ]);
  });

  io.configure('development', function() {
    io.set('transports', ['websocket']);
  });

  var RedisStore = require('socket.io/lib/stores/redis')
    , pub = redis.createClient()
    , sub = redis.createClient()
    , client = redis.createClient();

  io.set('store', new RedisStore({
      redisPub: pub
    , redisSub: sub
    , redisClient: client
  }));

  io.sockets.on('connection',
    function(socket) {
      socket.on('subscribe', function(data) {
        if (data.timelineId) {
          console.log('User has subscribed to ' + data.timelineId + ' timeline')

          socket.join('timeline:' + data.timelineId);
        } else if (data.postId) {
          console.log('User has subscribed to ' + data.postId + ' post')

          socket.join('post:' + data.postId);
        }
      })

      socket.on('unsubscribe', function(data) {
        if (data.timelineId) {
          console.log('User has disconnected from ' + data.timelineId + ' timeline')

          socket.leave('timeline:' + data.timelineId);
        } else if (data.postId) {
          console.log('User has disconnected from ' + data.postId + ' post')

          socket.leave('post:' + data.postId);
        }
      })
    }
  )

  var sub = redis.createClient()
    , pub = redis.createClient();
        
  sub.subscribe('newPost', 'destroyPost',
                'newComment', 'destroyComment',
                'newLike', 'removeLike' )
  
  // TODO: extract to separate functions
  sub.on('message', function(channel, msg) {
    switch(channel) {
    case 'destroyPost':
      var data = JSON.parse(msg)
      var event = { postId: data.postId }

      io.sockets.in('timeline:' + data.timelineId).emit('destroyPost', event)
      break

    case 'newPost':
      var data = JSON.parse(msg)

      models.Post.findById(data.postId, function(err, post) {
        if (post) {
          post.toJSON({ select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes'],
                        createdBy: { select: ['id', 'username'] },
                        comments: { select: ['id', 'body', 'createdBy'],
                                    createdBy: { select: ['id', 'username'] }},
                        likes: { select: ['id', 'username']}
                      }, function(err, json) {
            var event = { post: json }
            io.sockets.in('timeline:' + data.timelineId).emit('newPost', event)
          })
        }
      })
      break

    case 'newComment': 
      var data = JSON.parse(msg)

      models.Comment.findById(data.commentId, function(err, comment) {
        if (comment) {
          comment.toJSON({ select: ['id', 'body', 'createdAt', 'updatedAt', 'createdBy'],
                           createdBy: { select: ['id', 'username'] }
                         }, function(err, json) {
            var event = { comment: json }

            if (data.timelineId)
              io.sockets.in('timeline:' + data.timelineId).emit('newComment', event)
            else
              io.sockets.in('post:' + data.postId).emit('newComment', event)
          })
        }
      })
      break

    case 'newLike':
      var data = JSON.parse(msg)

      models.User.findById(data.userId, function(err, user) {
        if (user) {
          user.toJSON({select: ['id', 'username']}, function(err, json) {
            var event = { user: json, postId: data.postId }

            if (data.timelineId)
              io.sockets.in('timeline:' + data.timelineId).emit('newLike', event)
            else
              io.sockets.in('post:' + data.postId).emit('newLike', event)
          })
        }
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
    }
  })
}
