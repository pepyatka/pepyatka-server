"use strict";

var PostsController = require('../../../controllers').PostsController

exports.addRoutes = function(app) {
  app.post('/v1/posts',                PostsController.create)
  app.get( '/v1/posts/:postId',        PostsController.show)
  app.put( '/v1/posts/:postId',        PostsController.update)
  app.post('/v1/posts/:postId/like',   PostsController.like)
  app.post('/v1/posts/:postId/unlike', PostsController.unlike)
}
