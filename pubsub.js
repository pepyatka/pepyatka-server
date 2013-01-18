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
      models.Post.findById(msg, function(post) {
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
      models.Comment.findById(msg, function(comment) {
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

    case 'newLike':
      console.log(msg[0])
      models.User.findById(msg[0], function(user) {
        if (user) {
          user.toJSON(function(json) {
            var clients = io.sockets.clients()
            async.forEach(clients, function(socket) {
              socket.emit('newLike', { user: json,
                                       postId: msg[1] })
            })
          })
        }
      })
      break
    }
  })
}
