"use strict";

var Promise = require('bluebird')
  , inherits = require("util").inherits
  , models = require("../../app/models")
  , AbstractModel = models.AbstractModel
  , User = models.User
  , Group = models.Group
  , mkKey = require("../support/models").mkKey
  , config = require('../../config/config').load()

exports.addModel = function(database) {
  var FeedFactory = function() {
  }

  inherits(FeedFactory, AbstractModel)

  FeedFactory.stopList = function() {
    return config.application.USERNAME_STOP_LIST
  }

  FeedFactory.findById = async function(identifier) {
    let type = await database.hgetAsync(mkKey(['user', identifier]), 'type')

    if (type === 'group') {
      return Group.findById(identifier)
    } else {
      return User.findById(identifier)
    }
  }

  FeedFactory.findByUsername = async function(username) {
    let identifier = await database.getAsync(mkKey(['username', username, 'uid']))
    return FeedFactory.findById(identifier)
  }

  return FeedFactory
}
