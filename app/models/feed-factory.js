"use strict";

import Promise from "bluebird"
import { inherits } from "util"

import { AbstractModel, User, Group } from "../../app/models"
import { mkKey } from "../support/models"
import { load as configLoader } from "../../config/config"
import { NotFoundException } from "../support/exceptions"

let config = configLoader()


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
