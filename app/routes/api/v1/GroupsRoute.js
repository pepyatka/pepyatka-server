"use strict";

var GroupsController = require('../../../controllers').GroupsController

exports.addRoutes = function(app) {
  app.post('/v1/groups', GroupsController.create)
  app.post('/v1/groups/:groupName/subscribers/:adminName/admin', GroupsController.admin)
  app.post('/v1/groups/:groupName/subscribers/:adminName/unadmin', GroupsController.unadmin)
}
