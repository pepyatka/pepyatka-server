"use strict";

var Promise = require('bluebird')
  , crypto = Promise.promisifyAll(require('crypto'))
  , uuid = require('uuid')
  , config = require('../../config/config').load()
  , inherits = require("util").inherits
  , AbstractModel = require('../models').AbstractModel
  , Timeline = require('../models').Timeline
  , mkKey = require("../support/models").mkKey

Promise.promisifyAll(crypto)

exports.addModel = function(database) {
  var User = function(params) {
    User.super_.call(this)

    this.id = params.id
    this.username = params.username
    this.screenName = params.screenName
    this.hashedPassword = params.hashedPassword
    this.salt = params.salt
    this.password = params.password
    if (parseInt(params.createdAt, 10))
      this.createdAt = params.createdAt
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = params.updatedAt
  }

  inherits(User, AbstractModel)

  User.className = User
  User.namespace = "user"
  User.findById = User.super_.findById

  Object.defineProperty(User.prototype, 'username', {
    get: function() { return this.username_ },
    set: function(newValue) {
      if (newValue)
        this.username_ = newValue.trim().toLowerCase()
    }
  })

  Object.defineProperty(User.prototype, 'screenName', {
    get: function() { return this.screenName_ },
    set: function(newValue) {
      if (newValue)
        this.screenName_ = newValue.trim()
    }
  })

  User.findByUsername = function(username) {
    return Promise.resolve(
      database.getAsync(mkKey(['username', username, 'uid']))
        .then(function(identifier) {
          return User.findById(identifier)
        })
    )
  }

  User.generateSalt = function() {
    return Promise.resolve(
      crypto.randomBytesAsync(16)
        .then(function(buf) {
          var token = buf.toString('hex')

          return token
        })
    )
  }

  User.hashPassword = function(clearPassword) {
    return crypto.createHash("sha1").
      update(config.saltSecret).
      update(clearPassword).
      digest("hex")
  }

  User.prototype.updateHashedPassword = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      if (that.password && that.password.length > 0)
        that.saltPassword(that.password)
        .then(function(hashedPassword) { resolve(that) } )
      else
        reject(new Error('Password cannot be blank'))
    })
  }

  User.prototype.saltPassword = function(clearPassword) {
    return Promise.resolve(
      User.generateSalt()
        .then(function(salt) {
          this.salt = salt
          this.hashedPassword = User.hashPassword(salt + User.hashPassword(clearPassword))
          return this.hashPassword
        }.bind(this))
    )
  }

  User.prototype.validPassword = function(clearPassword) {
    var hashedPassword = User.hashPassword(this.salt + User.hashPassword(clearPassword))
    return Promise.resolve(hashedPassword == this.hashedPassword)
  }

  User.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid
        , stopList = ['anonymous', 'public']

      valid = this.username.length > 1
        && this.screenName.length > 1
        && stopList.indexOf(this.username) == -1
        && this.password
        && this.password.length > 0

      valid ? resolve(valid) : reject(new Error("Invalid"))
    }.bind(this))
  }

  User.prototype.validateOnCreate = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      Promise.join(that.validate(),
                   that.validateUniquness(mkKey(['username', that.username, 'uid'])),
                   that.validateUniquness(mkKey(['user', that.id])),
                   function(valid, usernameIsUnique, idIsUnique) {
                     resolve(that)
                   })
        .catch(function(e) { reject(e) })
    })
  }

  User.prototype.create = function() {
    return new Promise(function(resolve, reject) {
      this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      this.screenName = this.screenName || this.username
      this.username = this.username
      this.id = uuid.v4()

      this.validateOnCreate()
        .then(function(user) { return user.updateHashedPassword() })
        .then(function(user) {
          Promise.all([
            database.setAsync(mkKey(['username', user.username, 'uid']), user.id),
            database.hmsetAsync(mkKey(['user', user.id]),
                                { 'username': user.username,
                                  'screeName': user.screenName,
                                  'createdAt': user.createdAt.toString(),
                                  'updatedAt': user.updatedAt.toString(),
                                  'salt': user.salt,
                                  'hashedPassword': user.hashedPassword
                                })
          ])
            .then(function(res) { resolve(user) })
        })
        .catch(function(e) { reject(e) })
    }.bind(this))
  }

  User.prototype.update = function(params) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.updatedAt = new Date().getTime()
      if (params.hasOwnProperty('screenName'))
        that.screenName = params.screenName

      that.validate()
        .then(function(user) {
          database.hmsetAsync(mkKey(['user', that.id]),
                              { 'screenName': that.screenName,
                                'updatedAt': that.updatedAt.toString()
                              })
        })
        .then(function() { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }


  User.prototype.getGenericTimelineId = function(name) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getTimelineIds()
        .then(function(timelineIds) {
          var timeline
          if (timelineIds[name]) {
            timeline = timelineIds[name]
          } else {
            timeline = new Timeline({
              name: name,
              userId: that.id
            })
            timeline = timeline.create()
          }
          return timeline
        })
        .then(function(timeline) { resolve(timeline.id) })
    })
  }

  User.prototype.getGenericTimeline = function(name, params) {
    var that = this

    return new Promise(function(resolve, reject) {
      that["get" + name + "TimelineId"]()
        .then(function(timelineId) { return Timeline.findById(timelineId) })
        .then(function(timeline) {
          that[name] = timeline
          resolve(timeline)
        })
    })
  }

  User.prototype.getRiverOfNewsTimelineId = function() {
    return this.getGenericTimelineId('RiverOfNews')
  }

  User.prototype.getRiverOfNewsTimeline = function(params) {
    return this.getGenericTimeline('RiverOfNews')
  }

  User.prototype.getLikesTimelineId = function() {
    return this.getGenericTimelineId('Likes')
  }

  User.prototype.getLikesTimeline = function(params) {
    return this.getGenericTimeline('Likes')
  }

  User.prototype.getPostsTimelineId = function() {
    return this.getGenericTimelineId('Posts')
  }

  User.prototype.getPostsTimeline = function(params) {
    return this.getGenericTimeline('Posts')
  }

  User.prototype.getCommentsTimelineId = function() {
    return this.getGenericTimelineId('Comments')
  }

  User.prototype.getCommentsTimeline = function(params) {
    return this.getGenericTimeline('Comments')
  }

  User.prototype.getTimelineIds = function() {
    return new Promise(function(resolve, reject) {
      database.hgetallAsync(mkKey(['user', this.id, 'timelines']))
        .then(function(timelineIds) { resolve(timelineIds || {}) })
    }.bind(this))
  }

  User.prototype.getTimelines = function(params) {
    return new Promise(function(resolve, reject) {
      this.getTimelineIds()
        .then(function(timelineIds) {
          Promise.map(Object.keys(timelineIds), function(timelineId) {
            return Timeline.findById(timelineIds[timelineId], params)
          })
            .then(function(timelines) {
              resolve(timelines)
            })
        })
    }.bind(this))
  }

  return User
}
