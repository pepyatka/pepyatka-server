"use strict";

import {FeedFactory} from '../../../models'
import {UsersController, GroupsController} from '../../../controllers'
import exceptions from '../../../support/exceptions'

exports.addController = function(app) {
  class FeedFactoriesController {
    static async update(req, res) {
      try {
        var feed = await FeedFactory.findById(req.params.userId)
        var controller = feed.isUser() ? UsersController : GroupsController
        controller.update(req, res)
      } catch (e) {
        exceptions.reportError(res)(e)
      }
    }
  }

  return FeedFactoriesController
}

