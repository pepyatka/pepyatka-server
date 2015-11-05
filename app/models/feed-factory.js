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
    let attrs = await database.hgetallAsync(mkKey(['user', identifier]))

    if (attrs.type === 'group') {
      return Group.initObject(attrs, identifier)
    } else {
      return User.initObject(attrs, identifier)
    }
  }

  FeedFactory.findByIds = async function(identifiers) {
    let keys = identifiers.map(id => mkKey(['user', id]))
    let requests = keys.map(key => ['hgetall', key])

    let responses = await database.batch(requests).execAsync()
    let objects = responses.map((attrs, i) => {
      if (attrs.type === 'group') {
        return Group.initObject(attrs, identifiers[i])
      } else {
        return User.initObject(attrs, identifiers[i])
      }
    })

    return objects
  }

  FeedFactory.findByUsername = async function(username) {
    let identifier = await database.getAsync(mkKey(['username', username, 'uid']))
    return FeedFactory.findById(identifier)
  }

  return FeedFactory
}
