var models = require('./app/models')
  , uuid = require('node-uuid')
  , redis = require('redis')
  , _ = require('underscore')

exports.listen = function(server, connections) {
  var io = require('socket.io').listen(server)
    , pub
    , sub
  
  io.sockets.on(
    'connection',

    function(socket) {
      // User wants to listen to real-time updates
      socket.on('subscribe', function(data) {
        // TODO: can return just ID instead of entire record
        console.log('User ' + data.username + ' has connected')
        models.User.findByUsername(data.username, function(user) {
          socket.userId = uuid.v4()
          connections[socket.userId] = socket
        })

        sub = redis.createClient();
        pub = redis.createClient();

        sub.subscribe('destroyPost')
        sub.on('message', function(channel, postId) {
          _.each(connections, function(socket) {
            socket.emit('destroyPost', { postId: postId })
          });
        })
      }),
      
      // User wants to stop listening to real-time updates
      socket.on('unsubscribe', function(data) {
        // Nothing to do here yet
      }),
      
      // New message sent
      socket.on('post', function(data) {
        console.log('new post')
      }),
      
      // New comment sent
      socket.on('comment', function(data) {
      }),

      socket.on('disconnect', function() {
        delete connections[socket.userId]
      })
    }
  )
}
