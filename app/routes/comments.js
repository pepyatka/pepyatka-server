var models = require('../models')
  , async = require('async')

exports.addRoutes = function(app, connections) {
  app.post('/v1/comments', function(req, res){
    var newComment = res.locals.currentUser.newComment(req.body)

    newComment.save(function(comment) {
      if (comment) {
        comment.toJSON(function(json) { 
          // TODO: redis publish event instead
          async.forEach(Object.keys(connections), function(socket, callback) {
            connections[socket].emit('newComment', { comment: json })

            callback(null)
          }, function() {
            res.jsonp(json)
          });
        })
      } else {
        res.jsonp({'error': 'incorrect postId'})
      }
    })
  });
}
