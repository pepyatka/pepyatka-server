"use strict";

var Promise = require('bluebird')
  , mkKey = require("../support/models").mkKey
  , _ = require('underscore')
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
            reject(new Error("Record not found"))
          }
        })
    })
  }

  /**
   * Given the ID of an object, returns a promise resolving to that object,
   * or a rejected promise if an object of that type with that ID does not exist.
   */
  AbstractModel.getById = function(identifier, params) {
    var that = this

    return this.findById(identifier, params).then(function(result) {
      if (result != null) {
        return Promise.resolve(result)
      }
      return Promise.reject(new NotFoundException("Can't find " + that.namespace))
    })
  }

  AbstractModel.prototype = {
    validateUniquness: function(attribute) {
      return new Promise(function(resolve, reject) {
        database.existsAsync(attribute)
          .then(function(res) {
            var valid = res === 0

            valid ? resolve(true) : reject(new Error("Invalid"))
          })
      })
    }
  }

  return AbstractModel
}
