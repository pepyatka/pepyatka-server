var models = require('./app/models')
  , redis = require('redis')
  , async = require('async')

exports.listen = function(io) {
  var sub = redis.createClient();
  var pub = redis.createClient();
        
  sub.subscribe('newPost', 'destroyPost',
                'newComment', 'destroyComment',
                'newLike', 'removeLike' )
  
  // TODO: extract to separate functions
  sub.on('message', function(channel, msg) {
    switch(channel) {
    case 'destroyPost':
      var clients = io.sockets.clients()
      async.forEach(clients, function(socket) {
        socket.emit('destroyPost', { postId: msg })
      })
      break

    case 'newPost':
      models.Post.findById(msg, function(err, post) {
        if (post) {
          post.toJSON(function(err, json) {
            var clients = io.sockets.clients()
            async.forEach(clients, function(socket) {
              socket.emit('newPost', { post: json })
            })
          })
        }
      })
      break

    case 'newComment': 
      models.Comment.findById(msg, function(err, comment) {
        if (comment) {
          comment.toJSON(function(err, json) {
            var clients = io.sockets.clients()
            async.forEach(clients, function(socket) {
              socket.emit('newComment', { comment: json })
            })
          })
        }
      })
      break

    case 'newLike':
      var data = JSON.parse(msg)
      models.User.findById(data.userId, function(err, user) {
        if (user) {
          user.toJSON(function(err, json) {
            var clients = io.sockets.clients()
            async.forEach(clients, function(socket) {
              socket.emit('newLike', { user: json,
                                       postId: data.postId })
            })
          })
        }
      })
      break

    case 'removeLike':
      var data = JSON.parse(msg)
      var clients = io.sockets.clients()
      async.forEach(clients, function(socket) {
        socket.emit('removeLike', { userId: data.userId,
                                    postId: data.postId})
      })
      break
    }
  })
}
