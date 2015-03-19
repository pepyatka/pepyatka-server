"use strict";

var CommentsController = require('../../../controllers').CommentsController

exports.addRoutes = function(app) {
  app.post('/v1/comments', CommentsController.create)
}
