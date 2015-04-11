"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require("util").inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , User = models.User
  , mkKey = require("../support/models").mkKey

exports.addModel = function(database) {
  var Group = function(params) {
    this.id = params.id
    this.username = params.username
    this.screenName = params.screenName
    this.createdAt = params.createdAt
    this.updatedAt = params.updatedAt
    if (params.hasOwnProperty('isPrivate')) {
      this.isPrivate = params.isPrivate
    } else {
      this.isPrivate = 0
    }
    this.type = "group"
  }

  inherits(Group, User)

  Group.className = Group
  Group.namespace = "user"
  Group.findById = Group.super_.findById
  Group.findByUsername = Group.super_.findByUsername

  Object.defineProperty(Group.prototype, 'username', {
    get: function() { return this.username_ },
    set: function(newValue) {
      if (newValue)
        this.username_ = newValue.trim().toLowerCase()
    }
  })

  Object.defineProperty(Group.prototype, 'screenName', {
    get: function() { return this.screenName_ },
    set: function(newValue) {
      if (newValue)
        this.screenName_ = newValue.trim()
    }
  })

  Group.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid

      valid = this.username.length > 1
        && this.screenName.length > 1
        && models.FeedFactory.stopList().indexOf(this.username) == -1

      valid ? resolve(valid) : reject(new Error("Invalid"))
    }.bind(this))
  }

  Group.prototype.create = function(ownerId) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.createdAt = new Date().getTime()
      that.updatedAt = new Date().getTime()
      that.screenName = that.screenName || that.username
      that.id = uuid.v4()

      that.validateOnCreate()
        .then(function(group) {
          var stats = new models.Stats({
            id: group.id
          })

          return Promise.all([
            database.setAsync(mkKey(['username', group.username, 'uid']), group.id),
            database.hmsetAsync(mkKey(['user', group.id]),
                                { 'username': group.username,
                                  'screenName': group.screenName,
                                  'type': group.type,
                                  'createdAt': group.createdAt.toString(),
                                  'updatedAt': group.updatedAt.toString(),
                                  'isPrivate': group.isPrivate
                                }),
            group.addAdministrator(ownerId),
            group.subscribeOwner(ownerId),
            stats.create()
          ])
        })
        .then(function(res) { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  Group.prototype.update = function(params) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.updatedAt = new Date().getTime()
      if (params.hasOwnProperty('screenName'))
        that.screenName = params.screenName

      that.validate()
        .then(function(user) {
          database.hmsetAsync(mkKey(['user', that.id]),
                              { 'screenName': that.screenName,
                                'isPrivate': that.isPrivate,
                                'updatedAt': that.updatedAt.toString()
                              })
        })
        .then(function() { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  Group.prototype.mkAdminsKey = function() {
    return mkKey(['user', this.id, 'administrators'])
  }

  Group.prototype.subscribeOwner = function(ownerId) {
    var that = this

    return new Promise(function(resolve, reject) {
      return User.findById(ownerId).bind({}).then(function(owner) {
        if (!owner) {
          resolve(null)
          return
        }
        this.owner = owner
        return that.getPostsTimelineId()
      })
      .then(function(timelineId) {
        return this.owner.subscribeTo(timelineId)
      })
      .then(function(res) { resolve(res)})
      .catch(function(e) { reject(e) })
    })
  }

  Group.prototype.addAdministrator = function(feedId) {
    var that = this
    var currentTime = new Date().getTime()

    return new Promise(function(resolve, reject) {
      database.zaddAsync(that.mkAdminsKey(), currentTime, feedId)
        .then(function(res) { resolve(res) })
        .catch(function(e) { reject(e) })
    })
  }

  Group.prototype.removeAdministrator = function(feedId) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getAdministratorIds()
          .then(function(adminIds) {
            if (adminIds.indexOf(feedId) == -1) {
              reject(new Error("Not an administrator"))
            }
            else if (adminIds.length == 1) {
              reject(new Error("Cannot remove last administrator"))
            }
            else {
              database.zremAsync(that.mkAdminsKey(), feedId)
                  .then(function(res) { resolve(res) })
                  .catch(function(e) { reject(e) })
            }
          })
    })
  }

  Group.prototype.getAdministratorIds = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.zrevrangeAsync(that.mkAdminsKey(), 0, -1)
        .then(function(result) { resolve(result) })
        .catch(function(e) { reject(e) })
    })
  }

  return Group
}
