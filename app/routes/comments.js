var models = require('../models')
  , _ = require('underscore')

exports.add_routes = function(app, connections) {
  app.post('/v1/comments', function(req, res){
    var comment = res.locals.current_user.newComment(req.body)

    comment.save(function() {
      // Routes should know nothing about sockets. Only models can
      // emit a message.
      comment.toJSON(function(json) { 
        _.each(connections, function(socket) {
          socket.emit('newComment', { comment: json })
        });

        res.jsonp(json)
      })
    })
  });
}
