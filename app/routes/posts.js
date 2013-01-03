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
    post = res.locals.current_user.newPost(req.body)

    post.save(function() {
      // Routes should know close to nothing about sockets. Only
      // models can emit a message.
      post.toJSON(function(json) {
        _.each(connections, function(socket) {
          socket.emit('newPost', { post: json })
        })

        res.jsonp(json)
      })
    })
  });
}
