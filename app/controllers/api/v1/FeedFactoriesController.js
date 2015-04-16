"use strict";

var models = require('../../../models')
  , controllers = require('../../../controllers')
  , exceptions = require('../../../support/exceptions')

exports.addController = function(app) {
  var FeedFactoriesController = function() {
  }

  FeedFactoriesController.update = function(req, res) {
    models.FeedFactory.findById(req.params.userId)
      .then(function(feed) {
        var controller = feed.isUser() ? controllers.UsersController : controllers.GroupsController
        controller.update(req, res)
      })
      .catch(exceptions.reportError(res))
  }

  return FeedFactoriesController
}

