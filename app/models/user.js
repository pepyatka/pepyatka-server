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
          .catch(function(e) { reject(e) })
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

  User.prototype.isValidEmail = async function() {
    return User.emailIsValid(this.email)
  }

  User.emailIsValid = async function(email) {
    // email is optional
    if (!email || email.length == 0) {
      return true
    }

    if (!validator.isEmail(email)) {
      return false
    }

    var uid = await database.getAsync(mkKey(['email', email, 'uid']))

    if (uid) {
      // email is taken
      return false
    }

    return true
  }

  User.prototype.isValidUsername = function() {
    var valid = this.username
        && this.username.length >= 3   // per the spec
        && this.username.length <= 25  // per the spec
        && this.username.match(/^[A-Za-z0-9]+$/)
        && models.FeedFactory.stopList().indexOf(this.username) == -1

    return Promise.resolve(valid)
  }

  User.prototype.isValidScreenName = function() {
    var valid = this.screenNameIsValid(this.screenName)

    return Promise.resolve(valid)
  }

  User.prototype.screenNameIsValid = function(screenName) {
    if (!screenName) {
      return false
    }

    var len = GraphemeBreaker.countBreaks(screenName)

    if (len < 3 || len > 25) {
      return false
    }

    return true
  }

  User.prototype.validate = async function() {
    var valid

    valid = this.isValidUsername().value()
      && this.isValidScreenName().value()
      && await this.isValidEmail()

    if (!valid)
      throw new Error("Invalid")

    return true
  }

  User.prototype.validateOnCreate = async function() {
    var promises = [
      this.validate(),
      this.validateUniquness(mkKey(['username', this.username, 'uid'])),
      this.validateUniquness(mkKey(['user', this.id]))
    ];

    await* promises

    return this
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

  User.prototype.dropIndexForEmail = function(email) {
    return database.delAsync(mkKey(['email', email, 'uid']))
  }

  User.prototype.create = async function() {
    this.createdAt = new Date().getTime()
    this.updatedAt = new Date().getTime()
    this.screenName = this.screenName || this.username

    this.id = uuid.v4()

    var user = await this.validateOnCreate()
    await user.initPassword()

    var promises = [
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
    ]

    await* promises

    var stats = new models.Stats({
      id: this.id
    })

    await stats.create()

    return this
  }

  User.prototype.update = async function(params) {
    var hasChanges = false
      , emailChanged = false
      , oldEmail = ""

    if (params.hasOwnProperty('screenName') && params.screenName != this.screenName) {
      if (!this.screenNameIsValid(params.screenName)) {
        throw new Error("Invalid screenname")
      }

      this.screenName = params.screenName
      hasChanges = true
    }

    if (params.hasOwnProperty('email') && params.email != this.email) {
      if (!(await User.emailIsValid(params.email))) {
        throw new Error("Invalid email")
      }

      oldEmail = this.email
      this.email = params.email

      hasChanges = true
      emailChanged = true
    }

    if (params.hasOwnProperty('isPrivate') && params.isPrivate != this.isPrivate) {
      if (params.isPrivate != '0' && params.isPrivate != '1') {
        // ???
        throw new Error("bad input")
      }

      if (params.isPrivate === '1' && this.isPrivate === '0')
        await this.unsubscribeNonFriends()
      else if (params.isPrivate === '0' && this.isPrivate === '1')
        await this.subscribeNonFriends()

      this.isPrivate = params.isPrivate
      hasChanges = true
    }

    if (hasChanges) {
      this.updatedAt = new Date().getTime()

      var payload = {
        'screenName': this.screenName,
        'email':      this.email,
        'isPrivate':  this.isPrivate,
        'updatedAt':  this.updatedAt.toString()
      }

      var promises = [
        database.hmsetAsync(mkKey(['user', this.id]), payload)
      ]

      if (emailChanged) {
        if (oldEmail.length != "") {
          promises.push(this.dropIndexForEmail(oldEmail))
        }
        if (this.email.length != "") {
          promises.push(this.createEmailIndex())
        }
      }

      await* promises
    }

    return this
  }

  User.prototype.subscribeNonFriends = async function() {
    // NOTE: this method is super ineffective as it iterates all posts
    // and then all comments in user's timeline, we could make it more
    // efficient when introduce Entries table with meta column (post to
    // timelines many-to-many over Entries)

    let timeline = await this.getPostsTimeline({currentUser: this.id})
    let posts = await timeline.getPosts(0, -1)

    let fixedUsers = []

    // first of all, let's revive likes
    for (let post of posts) {
      let actions = []

      let [likes, comments] = await* [post.getLikes(), post.getComments()];

      for (let usersChunk of _.chunk(likes, 10)) {
        let promises = usersChunk.map(async (user) => {
          let likesTimelineId = await user.getLikesTimelineId()
          let time = await database.zscoreAsync(mkKey(['post', post.id, 'likes']), user.id)

          actions.push(database.zaddAsync(mkKey(['timeline', likesTimelineId, 'posts']), time, post.id))
          actions.push(database.saddAsync(mkKey(['post', post.id, 'timelines']), likesTimelineId))
        })

        await* promises
      }

      let commenters = _.uniq(await* comments.map(comment => models.User.findById(comment.userId)), 'id')

      for (let usersChunk of _.chunk(commenters, 10)) {
        let promises = usersChunk.map(async (user) => {
          let commentsTimelineId = await user.getCommentsTimelineId()

          // NOTE: I'm cheating with time when we supposed to add that
          // post to comments timeline, but who notices this?
          let time = post.updatedAt

          actions.push(database.zaddAsync(mkKey(['timeline', commentsTimelineId, 'posts']), time, post.id))
          actions.push(database.saddAsync(mkKey(['post', post.id, 'timelines']), commentsTimelineId))
        })

        await* promises
      }

      await* actions

      fixedUsers = _.uniq(fixedUsers.concat(likes).concat(commenters), 'id')
    }

    for (let usersChunk of _.chunk(fixedUsers, 10)) {
      let promises = usersChunk.map(async (user) => {
        let [riverId, commentsTimeline, likesTimeline] = await* [
          user.getRiverOfNewsTimelineId(),
          user.getCommentsTimeline(),
          user.getLikesTimeline()
        ]

        await commentsTimeline.mergeTo(riverId)
        await likesTimeline.mergeTo(riverId)
      })

      await* promises
    }
  }

  User.prototype.unsubscribeNonFriends = async function() {
    var subscriptionIds = await this.getSubscriberIds()
    var timeline = await this.getPostsTimeline()

    // users that I'm not following are ex-followers now
    // var subscribers = await this.getSubscribers()
    // await* subscribers.map(function(user) {
    //   // this is not friend, let's unsubscribe her before going to private
    //   if (subscriptionIds.indexOf(user.id) === -1) {
    //     return user.unsubscribeFrom(timeline.id, { likes: true, comments: true })
    //   }
    // })

    // we need to review post by post as some strangers that are not
    // followers and friends could commented on or like my posts
    // let's find strangers first
    let posts = await timeline.getPosts(0, -1)

    let allUsers = []

    for (let post of posts) {
      let timelines = await post.getTimelines()
      let user_promises = timelines.map(timeline => timeline.getUser())
      let users = await* user_promises

      allUsers = _.uniq(allUsers.concat(users), 'id')
    }

    // and remove all private posts from all strangers timelines
    let users = _.filter(
      allUsers,
      user => (subscriptionIds.indexOf(user.id) === -1 && user.id != this.id)
    )

    for (let chunk of _.chunk(users, 10)) {
      let actions = chunk.map(user => user.unsubscribeFrom(timeline.id, { likes: true, comments: true, skip: true }))
      await* actions
    }
  }

  User.prototype.updatePassword = async function(password, passwordConfirmation) {
    this.updatedAt = new Date().getTime()
    if (password.length === 0) {
      throw new Error('Password cannot be blank')
    } else if (password !== passwordConfirmation) {
      throw new Error("Passwords do not match")
    }

    try {
      this.hashedPassword = await bcrypt.hashAsync(password, 10)

      await database.hmsetAsync(mkKey(['user', this.id]),
        { 'updatedAt': this.updatedAt.toString(),
          'hashedPassword': this.hashedPassword
        })

      return this
    } catch(e) {
      throw e //? hmmm?
    }
  }

  User.prototype.getAdministratorIds = async function() {
    return [this.id]
  }

  User.prototype.getAdministrators = async function() {
    return [this]
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

  User.prototype.getGenericTimeline = async function(name, params) {
    let timelineId = await this["get" + name + "TimelineId"](params)
    let timeline = await models.Timeline.findById(timelineId, params)

    timeline.posts = await timeline.getPosts(timeline.offset, timeline.limit)

    return timeline
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

  User.prototype.getDirectsTimelineId = function(params) {
    return this.getGenericTimelineId('Directs', params)
  }

  User.prototype.getDirectsTimeline = function(params) {
    return this.getGenericTimeline('Directs', params)
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

  /**
   * @return {Timeline[]}
   */
  User.prototype.getSubscriptions = async function() {
    var timelineIds = await this.getSubscriptionIds()

    var subscriptionPromises = timelineIds.map((timelineId) => models.Timeline.findById(timelineId))
    this.subscriptions = await* subscriptionPromises

    return this.subscriptions
  }

  User.prototype.getFriendIds = async function() {
    var timelines = await this.getSubscriptions()
    timelines = _.filter(timelines, _.method('isPosts'))
    return await* timelines.map((timeline) => timeline.userId)
  }

  User.prototype.getFriends = async function() {
    var userIds = await this.getFriendIds()
    return await* userIds.map((userId) => models.User.findById(userId))
  }

  User.prototype.getSubscriberIds = async function() {
    var timeline = await this.getPostsTimeline()
    var subscriberIds = await timeline.getSubscriberIds()
    this.subscriberIds = subscriberIds

    return this.subscriberIds
  }

  User.prototype.getSubscribers = async function() {
    var subscriberIds = await this.getSubscriberIds()
    var subscriberPromises = subscriberIds.map(userId => models.User.findById(userId))
    this.subscribers = await* subscriberPromises

    return this.subscribers
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
    var promises = [
      user.unsubscribeFrom(await this.getPostsTimelineId()),
      database.zaddAsync(mkKey(['user', this.id, 'bans']), currentTime, user.id)
    ]
    // reject if and only if there is a pending request
    var requestIds = await this.getSubscriptionRequestIds()
    if (requestIds.indexOf(user.id) >= 0)
      promises.push(this.rejectSubscriptionRequest(user.id))
    return await* promises
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
      let theUser

      models.Timeline.findById(timelineId)
        .then(function(newTimeline) {
          timeline = newTimeline
          return models.FeedFactory.findById(newTimeline.userId)
        })
        .then(function(user) {
          theUser = user
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
        .then(function(riverOfNewsId) { return timeline.mergeTo(riverOfNewsId) })
        .then(function() { return models.Stats.findById(that.id) })
        .then(function(stats) { return stats.addSubscription() })
        .then(function() { return models.Stats.findById(theUser.id) })
        .then(function(stats) { return stats.addSubscriber() })
        .then(function(res) { resolve(res) })
        .catch(function(e) { reject(e) })
    })
  }

  User.prototype.unsubscribeFrom = async function(timelineId, options = {}) {
    var timeline = await models.Timeline.findById(timelineId)
    var user = await models.FeedFactory.findById(timeline.userId)

    // a user cannot unsubscribe from herself
    if (user.username == this.username)
      throw new Error("Invalid")

    let promises = []

    if (_.isUndefined(options.skip)) {
      // remove timelines from user's subscriptions
      let timelineIds = await user.getPublicTimelineIds()

      let unsubPromises = _.flatten(timelineIds.map((timelineId) => [
        database.zremAsync(mkKey(['user', this.id, 'subscriptions']), timelineId),
        database.zremAsync(mkKey(['timeline', timelineId, 'subscribers']), this.id)
      ]))

      promises = promises.concat(unsubPromises)
    }

    // remove all posts of The Timeline from user's River of News
    promises.push(timeline.unmerge(await this.getRiverOfNewsTimelineId()))

    // remove all posts of The Timeline from likes timeline of user
    if (options.likes)
      promises.push(timeline.unmerge(await this.getLikesTimelineId()))

    // remove all post of The Timeline from comments timeline of user
    if (options.comments)
      promises.push(timeline.unmerge(await this.getCommentsTimelineId()))

    // update counters for subscriber and her friend
    promises.push((await models.Stats.findById(this.id)).removeSubscription())
    promises.push((await models.Stats.findById(user.id)).removeSubscriber())

    await* promises

    return this
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
    return config.profilePictures.storage.rootDir + config.profilePictures.path + this.getProfilePictureFilename(uuid, size)
  }

  User.prototype.getProfilePictureFilename = function(uuid, size) {
    return uuid + "_" + size + ".jpg"
  }

  User.prototype.getProfilePictureLargeUrl = function() {
    if (_.isEmpty(this.profilePictureUuid)) {
      return Promise.resolve('')
    }
    return Promise.resolve(config.profilePictures.url + config.profilePictures.path + this.getProfilePictureFilename(
        this.profilePictureUuid, User.PROFILE_PICTURE_SIZE_LARGE))
  }

  User.prototype.getProfilePictureMediumUrl = function() {
    if (_.isEmpty(this.profilePictureUuid)) {
      return Promise.resolve('')
    }
    return Promise.resolve(config.profilePictures.url + config.profilePictures.path + this.getProfilePictureFilename(
      this.profilePictureUuid, User.PROFILE_PICTURE_SIZE_MEDIUM))
  }

  /**
   * Checks if the specified user can post to the timeline of this user.
   */
  User.prototype.validateCanPost = function(postingUser) {
    var that = this
      , subscriptionIds
      , timelineIdA
      , timelineIdB

    // NOTE: when user is subscribed to another user she in fact is
    // subscribed to her posts timeline
    return new Promise(function(resolve, reject) {
      postingUser.getPostsTimelineId()
        .then(function(_timelineId) {
          timelineIdA = _timelineId
          return that.getPostsTimelineId()
        })
        .then(function(_timelineId) {
          timelineIdB = _timelineId
          return postingUser.getSubscriptionIds()
        })
        .then(function(_subscriptionIds) {
          subscriptionIds = _subscriptionIds
          return that.getSubscriptionIds()
        })
        .then(function(subscriberIds) {
          if ((subscriberIds.indexOf(timelineIdA) == -1
              || subscriptionIds.indexOf(timelineIdB) == -1)
              && postingUser.username != that.username) {
            return reject(new ForbiddenException("You can't send private messages to friends that are not mutual"))
          }

          return resolve(that)
        })
    })
  }

  User.prototype.validateCanSubscribe = async function(timelineId) {
    var timelineIds = await this.getSubscriptionIds()
    if (_.includes(timelineIds, timelineId)) {
      throw new ForbiddenException("You are already subscribed to that user")
    }
    var timeline = await models.Timeline.findById(timelineId)
    var banIds = await this.getBanIds()
    if (banIds.indexOf(timeline.userId) >= 0) {
      throw new ForbiddenException("You cannot subscribe to a banned user")
    }
    var user = await models.User.findById(timeline.userId)
    var theirBanIds = await user.getBanIds()
    if (theirBanIds.indexOf(this.id) >= 0) {
      throw new ForbiddenException("This user prevented your from subscribing to them")
    }

    if (user.isPrivate === '1')
      throw new ForbiddenException("You cannot subscribe to private feed")

    return timelineId
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

  User.prototype.validateCanComment = function(postId) {
    var that = this

    return new Promise(function(resolve, reject) {
      models.Post.findById(postId)
        .then(function(post) {
          if (post)
            return post.validateCanShow(that.id)
          else
            reject(new Error("Not found"))
        })
        .then(function(valid) {
          if (valid)
            resolve(that)
          else
            reject(new Error("Not found"))
        })
    })
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
              models.Post.findById(postId)
                .then(function(post) { return post.validateCanShow(that.id) })
                .then(function(valid) {
                  if (valid)
                    resolve(that)
                  else
                    reject(new Error("Not found"))
                })
              break;
          }
        }).catch(function(e) {
          reject(new Error("Failed to validate like"));
        })
    })

  }

  User.prototype.updateLastActivityAt = async function() {
    if (!this.isUser()) {
      // update group lastActivity for all subscribers
      var updatedAt = new Date().getTime()
      return database.hmsetAsync(mkKey(['user', this.id]),
                                 { 'updatedAt': updatedAt.toString() })
    }
  }

  User.prototype.sendSubscriptionRequest = async function(userId) {
    await this.validateCanSendSubscriptionRequest(userId)

    var currentTime = new Date().getTime()
    return await* [
      database.zaddAsync(mkKey(['user', userId, 'requests']), currentTime, this.id),
      database.zaddAsync(mkKey(['user', this.id, 'pending']), currentTime, userId)
    ]
  }

  User.prototype.acceptSubscriptionRequest = async function(userId) {
    await this.validateCanManageSubscriptionRequests(userId)

    await* [
      database.zremAsync(mkKey(['user', this.id, 'requests']), userId),
      database.zremAsync(mkKey(['user', userId, 'pending']), this.id)
    ]

    var timelineId = await this.getPostsTimelineId()

    var user = await models.User.findById(userId)
    return user.subscribeTo(timelineId)
  }

  User.prototype.rejectSubscriptionRequest = async function(userId) {
    await this.validateCanManageSubscriptionRequests(userId)

    return await* [
      database.zremAsync(mkKey(['user', this.id, 'requests']), userId),
      database.zremAsync(mkKey(['user', userId, 'pending']), this.id)
    ]
  }

  User.prototype.getPendingSubscriptionRequestIds = async function() {
    var key = mkKey(['user', this.id, 'pending'])
    this.pendingSubscriptionRequestIds = await database.zrevrangeAsync(key, 0, -1)
    return this.pendingSubscriptionRequestIds
  }

  User.prototype.getPendingSubscriptionRequests = async function() {
    var pendingSubscriptionRequestIds = await this.getPendingSubscriptionRequestIds()
    return await* pendingSubscriptionRequestIds.map((userId) => models.User.findById(userId))
  }

  User.prototype.getSubscriptionRequestIds = async function() {
    var key = mkKey(['user', this.id, 'requests'])
    return database.zrevrangeAsync(key, 0, -1)
  }

  User.prototype.getSubscriptionRequests = async function() {
    var subscriptionRequestIds = await this.getSubscriptionRequestIds()
    return await* subscriptionRequestIds.map((userId) => models.User.findById(userId))
  }

  User.prototype.validateCanSendSubscriptionRequest = async function(userId) {
    var key = mkKey(['user', userId, 'requests'])
    var exists = await database.zscoreAsync(key, this.id)
    var user = await models.User.findById(userId)
    var banIds = await user.getBanIds()

    // user can send subscription request if and only if subscription
    // is a private and this is first time user is subscribing to it
    if (!exists && user.isPrivate === '1' &&
       banIds.indexOf(this.id) === -1)
      return true

    throw new Error("Invalid")
  }

  User.prototype.validateCanManageSubscriptionRequests = async function(userId) {
    var key = mkKey(['user', this.id, 'requests'])
    var exists = await database.zscoreAsync(key, userId)

    if (!exists)
      throw new Error("Invalid")

    return true
  }

  User.prototype.validateCanBeAccessedByUser = async function(otherUser) {
    if (this.isPrivate !== '1') {
      return true
    }

    if (!otherUser) {
      // no anonymous users allowed
      return false
    }

    let subscriberIds = await this.getSubscriberIds()

    if (otherUser.id !== this.id && subscriberIds.indexOf(otherUser.id) == -1) {
      // not an owner and not a subscriber
      return false
    }

    return true
  }

  return User
}
