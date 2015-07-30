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

  AbstractModel.findById = function(identifier, params) {
    var that = this

    return new Promise(function(resolve, reject) {
      database.hgetallAsync(mkKey([that.namespace, identifier]))
        .then(function(attrs) {
          if (attrs !== null) {
            attrs.id = identifier
            _.each(params, function(value, key) { attrs[key] = value })
            resolve(new that.className(attrs))
          } else {
            resolve(null)
          }
        })
    })
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
