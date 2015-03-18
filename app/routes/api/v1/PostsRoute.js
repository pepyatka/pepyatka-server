"use strict";

var PostsController = require('../../../controllers').PostsController

exports.addRoutes = function(app) {
  app.post('/v1/posts', PostsController.create)
}
