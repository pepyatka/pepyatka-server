var models = require('./app/models')
  , redis = require('redis')
  , async = require('async')

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
        console.log('User ' + data.timelineId + ' has connected')

        socket.join(data.timelineId);
      })

      socket.on('unsubscribe', function(data) {
        console.log('User ' + data.timelineId + ' has disconnected')

        socket.leave(data.timelineId);
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

      io.sockets.in(data.timelineId).emit('destroyPost', { postId: data.postId })
      break

    case 'newPost':
      var data = JSON.parse(msg)

      models.Post.findById(data.postId, function(err, post) {
        if (post) {
          post.toJSON(function(err, json) {
            io.sockets.in(data.timelineId).emit('newPost', { post: json })
          })
        }
      })
      break

    case 'newComment': 
      var data = JSON.parse(msg)

      models.Comment.findById(data.commentId, function(err, comment) {
        if (comment) {
          comment.toJSON(function(err, json) {
            io.sockets.in(data.timelineId).emit('newComment', { comment: json })
          })
        }
      })
      break

    case 'newLike':
      var data = JSON.parse(msg)

      models.User.findById(data.userId, function(err, user) {
        if (user) {
          user.toJSON(function(err, json) {
            io.sockets.in(data.timelineId).emit('newLike', { user: json,
                                                             postId: data.postId })
          })
        }
      })
      break

    case 'removeLike':
      var data = JSON.parse(msg)

      io.sockets.in(data.timelineId).emit('removeLike', { userId: data.userId,
                                                          postId: data.postId })
      break
    }
  })
}
