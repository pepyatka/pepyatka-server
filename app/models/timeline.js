"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require("util").inherits
  , AbstractModel = require('../models').AbstractModel
  , mkKey = require("../support/models").mkKey

exports.addModel = function(database) {
  var Timeline = function(params) {
    Timeline.super_.call(this)

    this.id = params.id
    this.name = params.name
    this.userId = params.userId
    if (parseInt(params.createdAt, 10))
      this.createdAt = params.createdAt
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = params.updatedAt
  }

  inherits(Timeline, AbstractModel)

  Timeline.className = Timeline
  Timeline.namespace = "timeline"
  Timeline.findById = Timeline.super_.findById

  Object.defineProperty(Timeline.prototype, 'name', {
    get: function() { return this.name_ },
    set: function(newValue) {
      newValue ? this.name_ = newValue.trim() : this.name_ = ''
    }
  })

  Timeline.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid

      valid = this.name.length > 0
        && this.userId.length > 0

      valid ? resolve(valid) : reject(new Error("Invalid"))
    }.bind(this))
  }

  Timeline.prototype.validateOnCreate = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      Promise.join(that.validate(),
                   that.validateUniquness(mkKey(['timeline', that.id])),
                   function(valid, idIsUnique) {
                     resolve(that)
                   })
        .catch(function(e) { reject(e) })
      })
  }

  Timeline.prototype.create = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.createdAt = new Date().getTime()
      that.updatedAt = new Date().getTime()
      that.id = uuid.v4()

      that.validateOnCreate()
        .then(function(timeline) {
          Promise.all([
            database.hmsetAsync(mkKey(['user', that.userId, 'timelines']),
                                'RiverOfNews', that.id),
            database.hmsetAsync(mkKey(['timeline', that.id]),
                                { 'name': that.name,
                                  'userId': that.userId,
                                  'createdAt': that.createdAt.toString(),
                                  'updatedAt': that.updatedAt.toString(),
                                })
          ])
            .then(function(res) { resolve(that) })
        })
        .catch(function(e) { reject(e) })
    })
  }

  Timeline.prototype.update = function(params) {
  }

  return Timeline
}
