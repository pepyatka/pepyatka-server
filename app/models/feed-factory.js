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

  FeedFactory.stopList = function(default_stop_list) {
    if (default_stop_list)
      return config.application.DEFAULT_STOP_LIST
    else
      return config.application.USERNAME_STOP_LIST
  }

  FeedFactory.findById = function(identifier) {
    return new Promise(function(resolve, reject) {
      database.hgetAsync(mkKey(['user', identifier]), 'type')
        .then(function(type) {
          switch(type) {
          case 'group':
            Group.findById(identifier)
              .then(function(group) { resolve(group) })
            break

          default:
            User.findById(identifier)
              .then(function(user) { resolve(user) })
            break
          }
        })
    })
  }

  FeedFactory.findByUsername = function(username) {
    return Promise.resolve(
      database.getAsync(mkKey(['username', username, 'uid']))
        .then(function(identifier) {
          return FeedFactory.findById(identifier)
        })
    )
  }

  return FeedFactory
}
