"use strict";

var SessionController = require('../../../controllers').SessionController

exports.addRoutes = function(app) {
  app.post('/v1/session', SessionController.create)
  app.get('/v1/logout',  SessionController.destroy)
}
