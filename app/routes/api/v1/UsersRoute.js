"use strict";

var UsersController = require('../../../controllers').UsersController
  , FeedFactoriesController = require('../../../controllers').FeedFactoriesController

exports.addRoutes = function(app) {
  app.post('/v1/users',                         UsersController.create)
  app.post('/v1/users/sudo',                    UsersController.sudoCreate)
  app.get( '/v1/users/whoami',                  UsersController.whoami)
  app.get( '/v1/users/:username',               UsersController.show)
  app.put( '/v1/users/updatePassword',          UsersController.updatePassword)
  app.post('/v1/users/updateProfilePicture',    UsersController.updateProfilePicture)
  app.put( '/v1/users/:userId',                 FeedFactoriesController.update)
  app.post('/v1/users/:username/subscribe',     UsersController.subscribe)
  app.post('/v1/users/:username/unsubscribe',   UsersController.unsubscribe)
  app.get( '/v1/users/:username/subscribers',   UsersController.subscribers)
  app.get( '/v1/users/:username/subscriptions', UsersController.subscriptions)
}
