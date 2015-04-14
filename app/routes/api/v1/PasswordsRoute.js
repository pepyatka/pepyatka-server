"use strict";

var PasswordsController = require('../../../controllers').PasswordsController

exports.addRoutes = function(app) {
  app.post('/v1/passwords',                     PasswordsController.create)
  app.put( '/v1/passwords/:resetPasswordToken', PasswordsController.update)
}
