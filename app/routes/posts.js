var models = require('../models')
  , _ = require('underscore')

exports.add_routes = function(app, connections) {
  app.get('/v1/posts/:postId', function(req, res) {
    models.Post.find(req.params.postId, function(post) {
      res.jsonp(post);
    })
  })

  app.post('/v1/posts', function(req, res){
    attrs = req.body
    // TODO -> User.newPost(new models.Post(attrs)
    attrs.user = res.locals.current_user
    attrs.user_id = req.session.user_id

    post = new models.Post(attrs)

    post.save(function() {
      _.each(connections, function(socket) {
        socket.emit('newPost', { post: post })
      })

      res.jsonp(post)
    })
  });
}
