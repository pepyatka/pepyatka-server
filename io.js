exports.add_sockets = function() {
  return function(socket) {
    // User wants to listen to real-time updates
    socket.on('subscribe', function(data) {
      // nothing to do yet
    }),

    // User wants to stop listening to real-time updates
    socket.on('unsubscribe', function(data) {
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
