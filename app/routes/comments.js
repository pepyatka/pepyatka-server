var models = require('../models')
  , async = require('async')

exports.addRoutes = function(app, connections) {
  app.post('/v1/comments', function(req, res){
    // TODO: filter body params - known as strong params
    var newComment = res.locals.currentUser.newComment({
      body: req.body.body,
      postId: req.body.postId
    })

    newComment.save(function(comment) {
      if (comment) {
        comment.toJSON(function(json) { 
          // TODO: redis publish event instead
          // TODO: measure perf with async.forEach and plain each method
          async.forEach(Object.keys(connections), function(socket, callback) {
            connections[socket].emit('newComment', { comment: json })

            callback(null)
          }, function() {
            res.jsonp(json)
          });
        })
      } else {
        // Just a stupid case - strong parameters will make it cleaner
        res.jsonp({'error': 'incorrect postId'})
      }
    })
  });
}
