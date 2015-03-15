"use strict";

var Promise = require('bluebird')
  , mkKey = require("../support/models").mkKey

exports.addModel = function(database) {
  var AbstractModel = function() {
  }

  AbstractModel.findById = function(identifier) {
    var that = this

    return new Promise(function(resolve, reject) {
      database.hgetallAsync(mkKey([that.namespace, identifier]))
        .then(function(attrs) {
          if (attrs !== null) {
            attrs.id = identifier
            resolve(new that.className(attrs))
          } else {
            resolve(null)
          }
        })
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
