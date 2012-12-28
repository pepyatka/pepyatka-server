var models = require('./app/models')
  , uuid = require('node-uuid')


exports.add_sockets = function(connections) {
  return function(socket) {
    // User wants to listen to real-time updates
    socket.on('subscribe', function(data) {
      // TODO: can return just ID instead of entire record
      console.log('User ' + data.username + ' has connected')
      models.User.find_by_username(data.username, function(user) {
        // connections[user.id] = socket
        connections[uuid.v4()] = socket
      })
    }),

    // User wants to stop listening to real-time updates
    socket.on('unsubscribe', function(data) {
      // Nothing to do here yet
    }),

    // New message sent
    socket.on('message', function(data) {
      console.log('new message')
    }),

    // New comment sent
    socket.on('comment', function(data) {
    })
  }
}
