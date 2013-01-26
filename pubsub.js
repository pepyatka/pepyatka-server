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
