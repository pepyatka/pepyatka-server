"use strict";

var SessionController = require('../../../controllers').SessionController

exports.addRoutes = function(app) {
  app.post('/v1/session', SessionController.create)
}
