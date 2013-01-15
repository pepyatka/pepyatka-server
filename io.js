var models = require('./app/models')
  , uuid = require('node-uuid')
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
    , redis = require('redis')
    , pub = redis.createClient()
    , sub = redis.createClient()
    , client = redis.createClient();

  io.set('store', new RedisStore({
      redisPub: pub
    , redisSub: sub
    , redisClient: client
  }));

  io.sockets.on(
    'connection',

    function(socket) {
      // User wants to listen to real-time updates. At this moment we
      // can get by with this simple push/pull, however once we
      // introduce real users - needs to be heavily refactored 
      socket.on('subscribe', function(data) {
        console.log('User ' + data.userId + ' has connected')
        
        socket.set('userId', data.userId)
      })
    }
  )

  return io;
}
