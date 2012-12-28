var models = require('../models')
  , _ = require('underscore')

exports.add_routes = function(app, connections) {
  app.post('/v1/comments', function(req, res){
    attrs = req.body
    // TODO -> Post.newComment(new models.Comment(attrs)
    attrs.user = res.locals.current_user
    attrs.user_id = req.session.user_id

    comment = new models.Comment(attrs)

    comment.save(function() {
      _.each(connections, function(socket) {
        socket.emit('comment', { comment: comment })
      })

      res.jsonp(comment)
    })
  });
}
