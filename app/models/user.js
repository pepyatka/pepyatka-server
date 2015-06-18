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
  , bcrypt = Promise.promisifyAll(require('bcrypt'))
  , gm = Promise.promisifyAll(require('gm'))
  , GraphemeBreaker = require('grapheme-breaker')

exports.addModel = function(database) {
  /**
   * @constructor
   */
  var User = function(params) {
    User.super_.call(this)

    var password = null

    this.id = params.id
    this.username = params.username
    this.screenName = params.screenName
    this.email = params.email

    if (!_.isUndefined(params.hashedPassword)) {
      this.hashedPassword = params.hashedPassword
    } else {
      password = params.password || ''
    }

    this.isPrivate = params.isPrivate
    this.resetPasswordToken = params.resetPasswordToken
    this.resetPasswordSentAt = params.resetPasswordSentAt
    if (parseInt(params.createdAt, 10))
      this.createdAt = params.createdAt
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = params.updatedAt
    this.type = "user"

    this.profilePictureUuid = params.profilePictureUuid || ''

    this.initPassword = function() {
      if (!_.isNull(password)) {
        var future = this.updatePassword(password, password)
        password = null

        return future
      } else {
        return Promise.resolve(this)
      }
    }
  }

  inherits(User, AbstractModel)

  User.className = User
  User.namespace = "user"
  User.findById = User.super_.findById
  User.getById = User.super_.getById
  User.findByAttribute = User.super_.findByAttribute

  User.PROFILE_PICTURE_SIZE_LARGE = 75
  User.PROFILE_PICTURE_SIZE_MEDIUM = 50
  User.PROFILE_PICTURE_SIZE_SMALL = 25

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
      this.isPrivate_ = newValue || '0'
    }
  })

  User.findByUsername = function(username) {
    return this.findByAttribute('username', username)
  }

  User.findByResetToken = function(token) {
    return this.findByAttribute('reset', token)
  }

  User.findByEmail = function(email) {
    return this.findByAttribute('email', email)
  }

  User.prototype.isUser = function() {
    return this.type === "user"
  }

  User.prototype.newPost = function(attrs) {
    var that = this
    attrs.userId = this.id

    return new Promise(function(resolve, reject) {
      if (!attrs.timelineIds || !attrs.timelineIds[0]) {
        that.getPostsTimelineId()
          .then(function(timelineId) {
            attrs.timelineIds = [timelineId]

            resolve(new models.Post(attrs))
          })
      } else {
        resolve(new models.Post(attrs))
      }
    }.bind(this))
  }

  User.prototype.updateResetPasswordToken = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.generateResetPasswordToken().bind({})
        .then(function(token) {
          var now = new Date().getTime()
          var oldToken = that.resetPasswordToken

          that.resetPasswordToken = token
          this.token = token

          return Promise.all([
            database.hmsetAsync(mkKey(['user', that.id]),
                                { 'resetPasswordToken': token,
                                  'resetPasswordSentAt': now
                                }),
            database.delAsync(mkKey(['reset', oldToken, 'uid'])),
            database.setAsync(mkKey(['reset', token, 'uid']), that.id)
          ])
        })
        .then(function() {
          var expireAfter = 60*60*24 // 24 hours
          database.expireAsync(mkKey(['reset', this.token, 'uid']), expireAfter)
        })
        .then(function() {
          resolve(this.token)
        })
    })
  }

  User.prototype.generateResetPasswordToken = function() {
    return Promise.resolve(
      crypto.randomBytesAsync(48)
        .then(function(buf) { return buf.toString('hex') })
    )
  }

  User.prototype.validPassword = function(clearPassword) {
    return bcrypt.compareAsync(clearPassword, this.hashedPassword)
  }

  User.prototype.isValidEmail = function() {
    var valid = true
    if (this.email.length > 0) {
      valid = validator.isEmail(this.email)
    }
    return Promise.resolve(valid)
  }

  User.prototype.isValidUsername = function() {
    var valid = this.username
        && this.username.length > 1
        && this.username.match(/^[A-Za-z0-9]+$/)
        && models.FeedFactory.stopList().indexOf(this.username) == -1

    return Promise.resolve(valid)
  }

  User.prototype.isValidScreenName = function() {
    var valid

    if (!this.screenName) {
      valid = false
    } else {
      var len = GraphemeBreaker.countBreaks(this.screenName)

      valid = len >= 3
          && len <= 25
    }

    return Promise.resolve(valid)
  }

  User.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid

      valid = this.isValidUsername().value()
        && this.isValidScreenName().value()
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

  //
  // Create database index from email to uid
  //
  User.prototype.createEmailIndex = function() {
    // email is optional, so no need to index an empty key
    if (this.email && this.email.length > 0) {
      return database.setAsync(mkKey(['email', this.email, 'uid']), this.id)
    }
    return new Promise.resolve(true)
  }

  User.prototype.create = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.createdAt = new Date().getTime()
      that.updatedAt = new Date().getTime()
      that.screenName = that.screenName || that.username

      that.id = uuid.v4()

      that.validateOnCreate()
        .then(function(user) {
          return user.initPassword()
        })
        .then(function(user) {
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
                                  'hashedPassword': user.hashedPassword
                                }),
            user.createEmailIndex()
            ])
        })
        .then(function() {
          var stats = new models.Stats({
            id: that.id
          })

          return stats.create()
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
          return Promise.all([
            database.hmsetAsync(mkKey(['user', that.id]),
                                { 'screenName': that.screenName,
                                  'email': that.email,
                                  'isPrivate': that.isPrivate,
                                  'updatedAt': that.updatedAt.toString()
                                }),
            that.createEmailIndex()
          ])
        })
        .then(function() { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  User.prototype.updatePassword = function(password, passwordConfirmation) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.updatedAt = new Date().getTime()

      if (password.length === 0) {
        reject(new Error('Password cannot be blank'))
      } else if (password !== passwordConfirmation) {
        reject(new Error("Passwords do not match"))
      } else {
        bcrypt.hashAsync(password, 10)
          .then(function(hashedPassword) {
            that.hashedPassword = hashedPassword
            return that
          })
          .then(function(user) {
            database.hmsetAsync(mkKey(['user', user.id]),
              { 'updatedAt': user.updatedAt.toString(),
                'hashedPassword': user.hashedPassword
              })
          })
          .then(function(res) { resolve(that) })
          .catch(function(e) { reject(e) })
      }
    })
  }

  User.prototype.getAdministratorIds = function() {
    return new Promise(function(resolve, reject) {
      resolve([])
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
        .then(function() { return models.Timeline.findById(that.id, params) })
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
        .then(function(res) { resolve(models.Timeline.findById(that.id, params)) })
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
          return that.getBanIds()
        })
        .then(function(banIds) {
          this.banIds = banIds
          return this.riverOfNewsTimeline.getPosts(this.riverOfNewsTimeline.offset,
                                                   this.riverOfNewsTimeline.limit)
        })
        .then(function(posts) {
          var self = this
          return Promise.map(posts, function(post) {
            // we check posts individually for the time being because
            // timestamp in timelines could be mistiming (several ms),
            // we need to refactor Timeline.prototype.updatePost method first
            return database.zscoreAsync(mkKey(['timeline', this.hidesTimelineId, 'posts']), post.id)
              .then(function(score) {
                if (score && score >= 0) {
                  post.isHidden = true
                }
                return post
              })
              .then(function(post) {
                return self.banIds.indexOf(post.userId) >= 0 ? null : post
              })
          }.bind(this))
        })
        .then(function(posts) {
          this.riverOfNewsTimeline.posts = posts
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

  User.prototype.getSubscriptionIds = async function() {
    this.subscriptionsIds = await database.zrevrangeAsync(mkKey(['user', this.id, 'subscriptions']), 0, -1)
    return this.subscriptionsIds
  }

  User.prototype.getSubscriptions = async function() {
    var userIds = await this.getSubscriptionIds()

    var subscriptionPromises = userIds.map((userId) => models.Timeline.findById(userId))
    this.subscriptions = await* subscriptionPromises

    return this.subscriptions
  }

  User.prototype.getBanIds = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.zrevrangeAsync(mkKey(['user', that.id, 'bans']), 0, -1)
        .then(function(userIds) { resolve(userIds) })
    })
  }

  User.prototype.getBans = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getBanIds()
        .then(function(userIds) {
          return Promise.map(userIds, function(userId) {
            return models.findById(userId)
          })
        })
        .then(function(users) { resolve(users) })
    })
  }

  User.prototype.ban = async function(username) {
    var currentTime = new Date().getTime()
    var user = await models.User.findByUsername(username)
    return database.zaddAsync(mkKey(['user', this.id, 'bans']), currentTime, user.id)
  }

  User.prototype.unban = async function(username) {
    var user = await models.User.findByUsername(username)
    return database.zremAsync(mkKey(['user', this.id, 'bans']), user.id)
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

  User.prototype.unsubscribeFrom = function(timelineId) {
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

  User.prototype.updateProfilePicture = function(file) {
    var that = this

    var image = Promise.promisifyAll(gm(file.path))
    return image.sizeAsync()
        .bind({})
        .catch(function(err) {
          return Promise.reject(new exceptions.BadRequestException("Not an image file"))
        })
        .then(function(originalSize) {
          var newUuid = uuid.v4()
          this.profilePictureUid = newUuid
          return Promise.map([User.PROFILE_PICTURE_SIZE_LARGE,
                              User.PROFILE_PICTURE_SIZE_MEDIUM,
                              User.PROFILE_PICTURE_SIZE_SMALL], function (size) {
            return that.saveProfilePictureWithSize(file.path, newUuid, originalSize, size)
          })
        })
        .then(function() {
          that.updatedAt = new Date().getTime()
          that.profilePictureUuid = this.profilePictureUid
          return database.hmsetAsync(mkKey(['user', that.id]),
            {
              'profilePictureUuid': that.profilePictureUuid,
              'updatedAt': that.updatedAt.toString()
            });
        })
  }

  User.prototype.saveProfilePictureWithSize = function(path, uuid, originalSize, size) {
    var image = Promise.promisifyAll(gm(path))
    var origWidth = originalSize.width
    var origHeight = originalSize.height
    if (origWidth > origHeight) {
      var dx = origWidth - origHeight
      image = image.crop(origHeight, origHeight, dx / 2, 0)
    } else if (origHeight > origWidth) {
      var dy = origHeight - origWidth
      image = image.crop(origWidth, origWidth, 0, dy / 2)
    }
    image = image.resize(size, size)
    image = image.quality(95)
    var destPath = this.getProfilePicturePath(uuid, size)
    return image.writeAsync(destPath)
  }

  User.prototype.getProfilePicturePath = function(uuid, size) {
    return config.profilePictures.fsDir + this.getProfilePictureFilename(uuid, size)
  }

  User.prototype.getProfilePictureFilename = function(uuid, size) {
    return uuid + "_" + size + ".jpg"
  }

  User.prototype.getProfilePictureLargeUrl = function() {
    if (_.isEmpty(this.profilePictureUuid)) {
      return Promise.resolve('')
    }
    return Promise.resolve(config.profilePictures.urlDir + this.getProfilePictureFilename(
        this.profilePictureUuid, User.PROFILE_PICTURE_SIZE_LARGE))
  }

  User.prototype.getProfilePictureMediumUrl = function() {
    if (_.isEmpty(this.profilePictureUuid)) {
      return Promise.resolve('')
    }
    return Promise.resolve(config.profilePictures.urlDir + this.getProfilePictureFilename(
      this.profilePictureUuid, User.PROFILE_PICTURE_SIZE_MEDIUM))
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

  User.prototype.validateCanSubscribe = function(timelineId) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getSubscriptionIds()
        .then(function(timelineIds) {
          if (_.includes(timelineIds, timelineId)) {
          reject(new ForbiddenException("You already subscribed to that user"))
        }
        resolve(timelineId)
      })
    })
  }

  User.prototype.validateCanUnsubscribe = function(timelineId) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getSubscriptionIds()
        .then(function(timelineIds) {
          if (!_.includes(timelineIds, timelineId)) {
            return reject(new ForbiddenException("You are not subscribed to that user"))
          }
          return resolve(timelineId)
        })
    })
  }

  /* checks if user can like some post */
  User.prototype.validateCanLikePost = function(postId) {
    return this.validateCanLikeOrUnlikePost('like', postId)
  }

  User.prototype.validateCanUnLikePost = function(postId) {
    return this.validateCanLikeOrUnlikePost('unlike', postId)
  }

  User.prototype.validateCanLikeOrUnlikePost = function(action, postId) {
    var that = this

    return new Promise(function(resolve, reject) {
      return database.zscoreAsync(mkKey(['post', postId, 'likes']), that.id)
        .then(function(result) {
          switch (true) {
            case result != null && action == 'like':
              reject(new ForbiddenException("You can't like post that you have already liked"))
              break;
            case result == null && action == 'unlike':
              reject(new ForbiddenException("You can't un-like post that you haven't yet liked"))
              break;
            default:
              resolve(that);
              break;
          }
        }).catch(function(e) {
          reject(new Error("Failed to validate like"));
        })
    })

  }

  User.prototype.updateLastActivityAt = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      if (!that.isUser()) {
        // update group lastActivity for all subscribers
        var updatedAt = new Date().getTime()
        that.getPostsTimeline()
          .then(function(timeline) { return timeline.getSubscriberIds() })
          .then(function(userIds) {
            return Promise.map(userIds, function(userId) {
              return database.zaddAsync(mkKey(['user', userId, 'subscriptions']), updatedAt, that.id)
            })
          })
          .then(function() {
            return database.hmsetAsync(mkKey(['user', that.id]),
                                       { 'updatedAt': updatedAt.toString() })
          })
          .then(function() { resolve() })
      } else {
        resolve()
      }
    })
  }

  return User
}
