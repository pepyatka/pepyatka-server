"use strict";

var Promise = require('bluebird')
  , crypto = Promise.promisifyAll(require('crypto'))
  , uuid = require('uuid')
  , config = require('../../config/config').load()
  , inherits = require("util").inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , FeedFactory = models.FeedFactory
  , Timeline = models.Timeline
  , mkKey = require("../support/models").mkKey
  , _ = require('underscore')

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
    this.type = "user"
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
      if (_.isString(newValue))
        this.screenName_ = newValue.trim()
    }
  })

  User.findByUsername = function(username) {
    var that = this
    username = username.trim().toLowerCase()
    return Promise.resolve(
      database.getAsync(mkKey(['username', username, 'uid']))
        .then(function(identifier) {
          return that.className.findById(identifier)
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

  User.prototype.newPost = function(attrs) {
    var that = this
    attrs.userId = this.id

    return new Promise(function(resolve, reject) {
      if (!attrs.timelineIds || !attrs.timelineIds[0]) {
        that.getPostsTimelineId()
          .then(function(timelineId) {
            attrs.timelineIds = [timelineId];

            resolve(new models.Post(attrs))
          })
      } else {
        resolve(new models.Post(attrs))
      }
    }.bind(this))
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

      valid = this.username.length > 1
        && this.screenName.length > 1
        && models.FeedFactory.stopList().indexOf(this.username) == -1
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
    var that = this

    return new Promise(function(resolve, reject) {
      that.createdAt = new Date().getTime()
      that.updatedAt = new Date().getTime()
      that.screenName = that.screenName || that.username
      that.username = that.username
      that.id = uuid.v4()

      that.validateOnCreate()
        .then(function(user) { return user.updateHashedPassword() })
        .then(function(user) {
          return Promise.all([
            database.setAsync(mkKey(['username', user.username, 'uid']), user.id),
            database.hmsetAsync(mkKey(['user', user.id]),
                                { 'username': user.username,
                                  'screenName': user.screenName,
                                  'type': user.type,
                                  'createdAt': user.createdAt.toString(),
                                  'updatedAt': user.updatedAt.toString(),
                                  'salt': user.salt,
                                  'hashedPassword': user.hashedPassword
                                })
          ])
        })
        .then(function(res) { resolve(that) })
        .catch(function(e) { reject(e) })
    })
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
            timeline = models.Timeline.findById(timelineIds[name])
          } else {
            timeline = new models.Timeline({
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
        .then(function(timelineId) { return models.Timeline.findById(timelineId) })
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
          return Promise.map(Object.keys(timelineIds), function(timelineId) {
            return models.Timeline.findById(timelineIds[timelineId], params)
          })
        })
        .then(function(timelines) {
          resolve(timelines)
        })
    }.bind(this))
  }

  User.prototype.getPublicTimelineIds = function() {
    return Promise.all([
      this.getCommentsTimelineId(),
      this.getLikesTimelineId(),
      this.getPostsTimelineId()
    ])
  }

  User.prototype.subscribeTo = function(timelineId) {
    var currentTime = new Date().getTime()
    var that = this
    var timeline

    return new Promise(function(resolve, reject) {
      models.Timeline.findById(timelineId)
        .then(function(newTimeline) {
          timeline = newTimeline
          return models.FeedFactory.findById(newTimeline.userId)
        })
        .then(function(user) {
          if (user.username == that.username)
            throw new Error("Invalid")

          return user.getPublicTimelineIds()
        })
        .then(function(timelineIds) {
          return Promise.map(timelineIds, function(timelineId) {
            return Promise.all([
              database.zaddAsync(mkKey(['user', that.id, 'subscriptions']), currentTime, timelineId),
              database.zaddAsync(mkKey(['timeline', timelineId, 'subscribers']), currentTime, that.id)
            ])
          })
        })
        .then(function(res) { return that.getRiverOfNewsTimelineId() })
        .then(function(riverOfNewsId) { return timeline.merge(riverOfNewsId) })
        .then(function(res) { resolve(res) })
        .catch(function(e) { reject(e) })
    })
  }

  User.prototype.unsubscribeTo = function(timelineId) {
    var currentTime = new Date().getTime()
    var that = this
    var timeline

    return new Promise(function(resolve, reject) {
      models.Timeline.findById(timelineId)
        .then(function(newTimeline) {
          timeline = newTimeline
          return models.FeedFactory.findById(newTimeline.userId)
        })
        .then(function(user) { return user.getPublicTimelineIds() })
        .then(function(timelineIds) {
          return Promise.map(timelineIds, function(timelineId) {
            return Promise.all([
              database.zremAsync(mkKey(['user', that.id, 'subscriptions']), timelineId),
              database.zremAsync(mkKey(['timeline', timelineId, 'subscribers']), that.id)
            ])
          })
        })
        .then(function(res) { return that.getRiverOfNewsTimelineId() })
        .then(function(riverOfNewsId) { return timeline.unmerge(riverOfNewsId) })
        .then(function(res) { resolve(res) })
    })
  }

  User.prototype.newComment = function(attrs) {
    return new Promise(function(resolve, reject) {
      attrs.userId = this.id

      resolve(new models.Comment(attrs))
    }.bind(this))
  }

  return User
}
