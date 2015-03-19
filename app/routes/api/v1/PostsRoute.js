"use strict";

var PostsController = require('../../../controllers').PostsController

exports.addRoutes = function(app) {
  app.post('/v1/posts',                PostsController.create)
  app.post('/v1/posts/:postId/like',   PostsController.like)
  app.post('/v1/posts/:postId/unlike', PostsController.unlike)
}
