var models = require('../models')
  , _ = require('underscore')

exports.add_routes = function(app, connections) {
  app.post('/v1/comments', function(req, res){
    var newComment = res.locals.current_user.newComment(req.body)

    newComment.save(function(comment) {
      // Routes should know nothing about sockets. Only models can
      // emit a message.
      comment.toJSON(function(json) { 
        _.each(connections, function(socket) {
          socket.emit('newComment', { comment: json })
        });

        console.log(json)

        res.jsonp(json)
      })
    })
  });
}
