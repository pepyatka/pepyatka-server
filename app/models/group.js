var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')
  , util = require('util')
  , crypto = require('crypto')

exports.addModel = function(db) {
  function Group(params) {
    Group.super_.call(this, params);

    this.type = "group"
  }

  util.inherits(Group, models.User)

  Group.prototype = {
    validate: function(callback) {
      var that = this

      db.exists('group:' + this.id, function(err, groupExists) {
        callback(groupExists === 0 &&
                 that.username.length > 1)
      })
    },

    create: function(callback) {
      this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      this.id = uuid.v4()
    },

    update: function(callback) {
      this.updatedAt = new Date().getTime()
    }
  }

  return Group;
}
