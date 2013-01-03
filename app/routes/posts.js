var models = require('../models')
  , _ = require('underscore')

exports.add_routes = function(app, connections) {
  app.get('/v1/posts/:postId', function(req, res) {
    models.Post.find(req.params.postId, function(post) {
      post.toJSON(function(json) {
       res.jsonp(json);
      })
    })
  })

  app.post('/v1/posts', function(req, res){
    attrs = req.body
    // TODO -> User.newPost(new models.Post(attrs)
    attrs.user = res.locals.current_user
    attrs.user_id = req.session.user_id

    post = new models.Post(attrs)

    post.save(function() {
      // Routes should know nothing about sockets. Only models can
      // emit a message.
      post.toJSON(function(json) {
        _.each(connections, function(socket) {
          socket.emit('newPost', { post: json })
        })

        res.jsonp(json);
      })
    })
  });
}
