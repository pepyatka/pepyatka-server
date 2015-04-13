"use strict";

var Promise = require('bluebird')
  , crypto = Promise.promisifyAll(require('crypto'))
  , uuid = require('uuid')
  , config = require('../../config/config').load()
  , inherits = require("util").inherits
  , models = require('../models')
  , exceptions = require('../support/exceptions')
  , ForbiddenException = exceptions.ForbiddenException
  , AbstractModel = models.AbstractModel
  , FeedFactory = models.FeedFactory
  , Timeline = models.Timeline
  , mkKey = require("../support/models").mkKey
  , _ = require('lodash')
  , validator = require('validator')

exports.addModel = function(database) {
  /**
   * @constructor
   */
  var User = function(params) {
    User.super_.call(this)

    this.id = params.id
    this.username = params.username
    this.screenName = params.screenName
    this.email = params.email
    this.hashedPassword = params.hashedPassword
    this.salt = params.salt
    this.password = params.password
    this.isPrivate = params.isPrivate
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

  Object.defineProperty(User.prototype, 'email', {
    get: function() { return _.isUndefined(this.email_) ? "" : this.email_ },
    set: function(newValue) {
      if (_.isString(newValue))
        this.email_ = newValue.trim()
    }
  })

  Object.defineProperty(User.prototype, 'isPrivate', {
    get: function() { return this.isPrivate_ },
    set: function(newValue) {
      this.isPrivate_ = newValue || "0"
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

  User.prototype.isValidEmail = function() {
    var valid = true
    if (this.email.length > 0) {
      valid = validator.isEmail(this.email)
    }
    return Promise.resolve(valid)
  }

  User.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid

      valid = this.username.length > 1
        && this.screenName.length > 1
        && models.FeedFactory.stopList().indexOf(this.username) == -1
        && this.isValidEmail().value()

      valid ? resolve(true) : reject(new Error("Invalid"))
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

      that.id = uuid.v4()

      that.validateOnCreate()
        .then(function(user) { return user.updateHashedPassword() })
        .then(function(user) {
          var stats = new models.Stats({
            id: user.id
          })

          return Promise.all([
            database.setAsync(mkKey(['username', user.username, 'uid']), user.id),
            database.hmsetAsync(mkKey(['user', user.id]),
                                { 'username': user.username,
                                  'screenName': user.screenName,
                                  'email': user.email,
                                  'type': user.type,
                                  'isPrivate': '0',
                                  'createdAt': user.createdAt.toString(),
                                  'updatedAt': user.updatedAt.toString(),
                                  'salt': user.salt,
                                  'hashedPassword': user.hashedPassword
                                }),
            stats.create()
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
      if (params.hasOwnProperty('email'))
        that.email = params.email
      that.isPrivate = params.isPrivate

      that.validate()
        .then(function() {
          database.hmsetAsync(mkKey(['user', that.id]),
                              { 'screenName': that.screenName,
                                'email': that.email,
                                'isPrivate': that.isPrivate,
                                'updatedAt': that.updatedAt.toString()
                              })
        })
        .then(function() { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  User.prototype.updatePassword = function(password, passwordConfirmation) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.updatedAt = new Date().getTime()

      if (password == passwordConfirmation) {
        that.password = password

        that.updateHashedPassword()
          .then(function(user) {
            database.hmsetAsync(mkKey(['user', user.id]),
                                { 'updatedAt': user.updatedAt.toString(),
                                  'salt': user.salt,
                                  'hashedPassword': user.hashedPassword
                                })
          })
          .then(function(res) { resolve(that) })
          .catch(function(e) { reject(e) })
      } else {
        reject(new Error("Invalid"))
      }
    })
  }

  User.prototype.getMyDiscussionsTimeline = function(params) {
    var that = this

    return new Promise(function(resolve, reject) {
      var commentsId
        , likesId

      Promise.join(
        that.getCommentsTimelineId(),
        that.getLikesTimelineId()
        , function(cId, lId) {
          commentsId = cId
          likesId = lId
        })
        .then(function() { return models.Timeline.findById(that.id) })
        .then(function(timeline) {
          if (!timeline) {
            timeline = new models.Timeline({
              id: that.id,
              name: "MyDiscussions",
              userId: that.id
            })
            return timeline.create()
          } else {
            return timeline
          }
        })
        .then(function(timeline) {
          return database.zunionstoreAsync(
            mkKey(['timeline', that.id, 'posts']), 2,
            mkKey(['timeline', commentsId, 'posts']),
            mkKey(['timeline', likesId, 'posts']),
            'AGGREGATE', 'MAX')
        })
        .then(function(res) { resolve(models.Timeline.findById(that.id)) })
    })
  }

  User.prototype.getGenericTimelineId = function(name, params) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getTimelineIds()
        .then(function(timelineIds) {
          var timeline
          if (timelineIds[name]) {
            params = params || {}
            timeline = models.Timeline.findById(timelineIds[name], {
              offset: params.offset,
              limit: params.limit
            })
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
      that["get" + name + "TimelineId"](params)
        .then(function(timelineId) { return models.Timeline.findById(timelineId, params) })
        .then(function(timeline) {
          that[name] = timeline
          resolve(timeline)
        })
    })
  }

  User.prototype.getHidesTimelineId = function(params) {
    return this.getGenericTimelineId('Hides', params)
  },

  User.prototype.getHidesTimeline = function(params) {
    return this.getGenericTimeline('Hides', params)
  }

  User.prototype.getRiverOfNewsTimelineId = function(params) {
    return this.getGenericTimelineId('RiverOfNews', params)
  }

  User.prototype.getRiverOfNewsTimeline = function(params) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getRiverOfNewsTimelineId(params).bind({})
        .then(function(timelineId) {
          this.riverOfNewsId = timelineId
          return that.getHidesTimelineId(params)
        })
        .then(function(timelineId) {
          this.hidesTimelineId = timelineId
          return models.Timeline.findById(this.riverOfNewsId, params)
        })
        .then(function(riverOfNewsTimeline) {
          this.riverOfNewsTimeline = riverOfNewsTimeline
          return models.Timeline.findById(this.hidesTimelineId)
        })
        // NOTE: this is better get done with zrangebyscore where min
        // is 25th post and max is 1st post.
        .then(function(hidesTimeline) {
          return hidesTimeline.getPostIds(0, 30)
        })
        .then(function(hiddenPostIds) {
          this.hiddenPostIds = hiddenPostIds
          return this.riverOfNewsTimeline.getPosts(this.riverOfNewsTimeline.offset,
                                                   this.riverOfNewsTimeline.limit)
        })
        .then(function(posts) {
          return Promise.map(posts, function(post) {
            if (this.hiddenPostIds.indexOf(post.id) >= 0) {
              post.isHidden = true
            }
            return post
          }.bind(this))
        })
        .then(function(posts) {
          resolve(this.riverOfNewsTimeline)
        })
    })
  }

  User.prototype.getLikesTimelineId = function(params) {
    return this.getGenericTimelineId('Likes', params)
  }

  User.prototype.getLikesTimeline = function(params) {
    return this.getGenericTimeline('Likes', params)
  }

  User.prototype.getPostsTimelineId = function(params) {
    return this.getGenericTimelineId('Posts', params)
  }

  User.prototype.getPostsTimeline = function(params) {
    return this.getGenericTimeline('Posts', params)
  }

  User.prototype.getCommentsTimelineId = function(params) {
    return this.getGenericTimelineId('Comments', params)
  }

  User.prototype.getCommentsTimeline = function(params) {
    return this.getGenericTimeline('Comments', params)
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

  User.prototype.getPublicTimelineIds = function(params) {
    return Promise.all([
      this.getCommentsTimelineId(params),
      this.getLikesTimelineId(params),
      this.getPostsTimelineId(params )
    ])
  }

  User.prototype.getSubscriptionIds = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.zrevrangeAsync(mkKey(['user', that.id, 'subscriptions']), 0, -1)
        .then(function(userIds) {
          that.subscriptionsIds = userIds
          resolve(userIds)
        })
    })
  }

  User.prototype.getSubscriptions = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getSubscriptionIds()
        .then(function(userIds) {
          return Promise.map(userIds, function(userId) {
            return models.Timeline.findById(userId)
          })
        })
        .then(function(subscriptions) {
          that.subscriptions = subscriptions
          resolve(that.subscriptions)
        })
    })
  }

  User.prototype.subscribeTo = function(timelineId) {
    var currentTime = new Date().getTime()
    var that = this
    var timeline

    return new Promise(function(resolve, reject) {
      models.Timeline.findById(timelineId).bind({})
        .then(function(newTimeline) {
          timeline = newTimeline
          return models.FeedFactory.findById(newTimeline.userId)
        })
        .then(function(user) {
          this.user = user
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
        .then(function() { return models.Stats.findById(that.id) })
        .then(function(stats) { return stats.addSubscription() })
        .then(function() { return models.Stats.findById(this.user.id) })
        .then(function(stats) { return stats.addSubscriber() })
        .then(function(res) { resolve(res) })
        .catch(function(e) { reject(e) })
    })
  }

  User.prototype.unsubscribeTo = function(timelineId) {
    var currentTime = new Date().getTime()
    var that = this
    var timeline

    return new Promise(function(resolve, reject) {
      models.Timeline.findById(timelineId).bind({})
        .then(function(newTimeline) {
          timeline = newTimeline
          return models.FeedFactory.findById(newTimeline.userId)
        })
        .then(function(user) {
          this.user = user
          if (user.username == that.username)
            throw new Error("Invalid")

          return user.getPublicTimelineIds()
        })
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
        .then(function() { return models.Stats.findById(that.id) })
        .then(function(stats) { return stats.removeSubscription() })
        .then(function() { return models.Stats.findById(this.user.id) })
        .then(function(stats) { return stats.removeSubscriber() })
        .then(function(res) { resolve(res) })
        .catch(function(e) { reject(e) })
    })
  }

  User.prototype.getStatistics = function() {
    return models.Stats.findById(this.id)
  }

  User.prototype.newComment = function(attrs) {
    return new Promise(function(resolve, reject) {
      attrs.userId = this.id

      resolve(new models.Comment(attrs))
    }.bind(this))
  }

  User.prototype.newAttachment = function(attrs) {
    return new Promise(function(resolve, reject) {
      attrs.userId = this.id

      resolve(new models.Attachment(attrs))
    }.bind(this))
  }

  /**
   * Checks if the specified user can post to the timeline of this user.
   */
  User.prototype.validateCanPost = function(postingUser) {
    if (postingUser.username != this.username) {
      return Promise.reject(new ForbiddenException("You can't post to another user's feed"))
    }
    return Promise.resolve(this)
  }

  return User
}
