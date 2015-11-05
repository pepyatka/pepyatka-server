"use strict";

var Promise = require('bluebird')
  , mkKey = require("../support/models").mkKey
  , _ = require('lodash')
  , exceptions = require('../support/exceptions')
  , NotFoundException = exceptions.NotFoundException

exports.addModel = function(database) {
  /**
   * @constructor
   */
  var AbstractModel = function() {
  }

  AbstractModel.initObject = function(attrs, identifier, params) {
    attrs.id = identifier
    _.each(params, function(value, key) {
      attrs[key] = value
    })

    return new this.className(attrs)
  }

  AbstractModel.findById = async function(identifier, params) {
    let attrs = await database.hgetallAsync(mkKey([this.namespace, identifier]))

    if (attrs === null) {
      return null
    }

    return this.initObject(attrs, identifier, params)
  }

  AbstractModel.findByIds = async function(identifiers) {
    let keys = identifiers.map(id => mkKey([this.namespace, id]))
    let requests = keys.map(key => ['hgetall', key])

    let responses = await database.multi(requests).execAsync()
    let objects = responses.map((attrs, i) => this.initObject(attrs, identifiers[i]))

    return objects
  }

  AbstractModel.findByAttribute = function(attribute, value) {
    var that = this
    value = value.trim().toLowerCase()

    return new Promise(function(resolve, reject) {
      database.getAsync(mkKey([attribute, value, 'uid']))
        .then(function(identifier) {
          if (identifier) {
            resolve(that.className.findById(identifier))
          } else {
            reject(new NotFoundException("Record not found"))
          }
        })
    })
  }

  /**
   * Given the ID of an object, returns a promise resolving to that object,
   * or a rejected promise if an object of that type with that ID does not exist.
   */
  AbstractModel.getById = async function(identifier, params) {
    var result = await this.findById(identifier, params)

    if (result !== null)
      return result

    throw new NotFoundException("Can't find " + this.namespace)
  }

  AbstractModel.prototype = {
    validateUniquness: async function(attribute) {
      var res = await database.existsAsync(attribute)

      if (res === 0)
        return true
      else
        throw new Error("Already exists")
    }
  }

  return AbstractModel
}
