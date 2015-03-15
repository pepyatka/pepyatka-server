"use strict";

var UsersController = require('../../../controllers').UsersController

exports.addRoutes = function(app) {
  app.post('/v1/users', UsersController.create)
}
