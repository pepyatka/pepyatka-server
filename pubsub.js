var models = require('./app/models')
  , redis = require('redis')
  , async = require('async')

exports.listen = function(connections) {
  var sub = redis.createClient();
  var pub = redis.createClient();
        
  sub.subscribe('destroyPost', 'newPost', 'newComment')
  
  // TODO: extract to separate functions
  sub.on('message', function(channel, objId) {
    switch(channel) {
    case 'destroyPost':
      async.forEach(Object.keys(connections), function(socket) {
        connections[socket].emit('destroyPost', { postId: objId })
      })
      break
    case 'newPost':
      models.Post.find(objId, function(post) {
        if (post) {
          post.toJSON(function(json) {
            async.forEach(Object.keys(connections), function(socket) {
              connections[socket].emit('newPost', { post: json })
            })
          })
        }
      })
      break

    case 'newComment': 
      models.Comment.find(objId, function(comment) {
        if (comment) {
          comment.toJSON(function(json) {
            async.forEach(Object.keys(connections), function(socket) {
              connections[socket].emit('newComment', { comment: json })
            })
          })
        }
      })
    }
  })
}
