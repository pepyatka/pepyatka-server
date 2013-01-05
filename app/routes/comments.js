var models = require('../models')
  , _ = require('underscore')

exports.addRoutes = function(app, connections) {
  app.post('/v1/comments', function(req, res){
    var newComment = res.locals.currentUser.newComment(req.body)

    newComment.save(function(comment) {
      // Routes should know nothing about sockets. Only models can
      // emit a message.
      comment.toJSON(function(json) { 
        // XXX: can we do this with EventEmmiters?
        _.each(connections, function(socket) {
          socket.emit('newComment', { comment: json })
        });

        console.log(json)

        res.jsonp(json)
      })
    })
  });
}
