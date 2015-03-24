"use strict";

var UsersController = require('../../../controllers').UsersController

exports.addRoutes = function(app) {
  app.post('/v1/users',                       UsersController.create)
  app.get( '/v1/users/whoami',                UsersController.whoami)
  app.post('/v1/users/:username/subscribe',   UsersController.subscribe)
  app.post('/v1/users/:username/unsubscribe', UsersController.unsubscribe)
  app.get( '/v1/users/:username/subscribers', UsersController.subscribers)
}
