var models = require('./app/models')
  , uuid = require('node-uuid')
  , redis = require('redis')
  , async = require('async')

exports.listen = function(server, connections) {
  var io = require('socket.io').listen(server)
    , pub
    , sub
  
  io.sockets.on(
    'connection',

    function(socket) {
      // User wants to listen to real-time updates. At this moment we
      // can get by with this simple push/pull, however once we
      // introduce real users - needs to be heavily refactored 
      socket.on('subscribe', function(data) {
        // TODO: can return just ID instead of entire record
        console.log('User ' + data.username + ' has connected')
        
        // save socket connections to redis to make them persistent
        socket.userId = uuid.v4()
        connections[socket.userId] = socket

        sub = redis.createClient();
        pub = redis.createClient();

        sub.subscribe('destroyPost')
        sub.on('message', function(channel, postId) {
          async.forEach(Object.keys(connections), function(socket) {
            connections[socket].emit('destroyPost', { postId: postId })
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

      // TODO: frankly speaking we never emit that event. As a result
      // once client closes its browser we will be sending updates to
      // nowhere. But for the time being we can skip this - I bet
      // there are 2.5 anons on that board.
      socket.on('disconnect', function() {
        delete connections[socket.userId]
      })
    }
  )
}
