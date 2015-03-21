"use strict";

var GroupsController = require('../../../controllers').GroupsController

exports.addRoutes = function(app) {
  app.post('/v1/groups', GroupsController.create)
}
