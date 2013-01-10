var models = require('../models')
  , _ = require('underscore')

exports.addRoutes = function(app, connections) {
  app.post('/v1/comments', function(req, res){
    var newComment = res.locals.currentUser.newComment(req.body)

    newComment.save(function(comment) {
      if (comment) {
        comment.toJSON(function(json) { 
          // TODO: redis publish event instead
          _.each(connections, function(socket) {
            socket.emit('newComment', { comment: json })
          });
          
          console.log(json)
          
          res.jsonp(json)
        })
      } else {
        res.jsonp({'error': 'incorrect postId'})
      }
    })
  });
}
