var models = require('./app/models')
  , redis = require('redis')
  , async = require('async')

exports.listen = function(io) {
  var sub = redis.createClient();
  var pub = redis.createClient();
        
  sub.subscribe('destroyPost', 'newPost', 'newComment')
  
  // TODO: extract to separate functions
  sub.on('message', function(channel, objId) {
    switch(channel) {
    case 'destroyPost':
      var clients = io.sockets.clients()
      async.forEach(clients, function(socket) {
        socket.emit('destroyPost', { postId: objId })
      })
      break

    case 'newPost':
      models.Post.find(objId, function(post) {
        if (post) {
          post.toJSON(function(json) {
            var clients = io.sockets.clients()
            async.forEach(clients, function(socket) {
              socket.emit('newPost', { post: json })
            })
          })
        }
      })
      break

    case 'newComment': 
      models.Comment.find(objId, function(comment) {
        if (comment) {
          comment.toJSON(function(json) {
            var clients = io.sockets.clients()
            async.forEach(clients, function(socket) {
              socket.emit('newComment', { comment: json })
            })
          })
        }
      })
      break
    }
  })
}
