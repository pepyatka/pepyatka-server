"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , GraphemeBreaker = require('grapheme-breaker')
  , inherits = require("util").inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , FeedFactory = models.FeedFactory
  , Timeline = models.Timeline
  , mkKey = require("../support/models").mkKey
  , _ = require('lodash')
  , pubSub = models.PubSub

exports.addModel = function(database) {
  /**
   * @constructor
   * @extends AbstractModel
   */
  var Post = function(params) {
    Post.super_.call(this)

    this.id = params.id
    this.body = params.body
    this.attachments = params.attachments
    this.userId = params.userId
    this.timelineIds = params.timelineIds
    this.currentUser = params.currentUser
    if (parseInt(params.createdAt, 10))
      this.createdAt = params.createdAt
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = params.updatedAt
    if (params.maxComments != 'all')
      this.maxComments = parseInt(params.maxComments, 10) || 2
    else
      this.maxComments = params.maxComments
    if (params.maxLikes != 'all')
      this.maxLikes = parseInt(params.maxLikes, 10) || 4
    else
      this.maxLikes = params.maxLikes
  }

  inherits(Post, AbstractModel)

  Post.className = Post
  Post.namespace = "post"
  Post.findById = Post.super_.findById
  Post.getById = Post.super_.getById

  Object.defineProperty(Post.prototype, 'body', {
    get: function() { return this.body_ },
    set: function(newValue) {
      newValue ? this.body_ = newValue.trim() : this.body_ = ''
    }
  })

  Post.prototype.validate = async function() {
    var valid

    valid = this.body && this.body.length > 0
      && this.userId && this.userId.length > 0

    if (!valid) {
      throw new Error("Invalid")
    }

    var len = GraphemeBreaker.countBreaks(this.body)

    if (len > 1500) {
      throw new Error("Maximum post-length is 1500 graphemes")
    }

    return this
  }

  Post.prototype.validateOnCreate = async function() {
    var promises = [
      this.validate(),
      this.validateUniquness(mkKey(['post', this.id]))
    ]

    await* promises

    return this
  }

  Post.prototype.create = async function() {
    this.createdAt = new Date().getTime()
    this.updatedAt = new Date().getTime()
    this.id = uuid.v4()

    await this.validateOnCreate()

    // save post to the database
    await database.hmsetAsync(mkKey(['post', this.id]),
                              { 'body': this.body,
                                'userId': this.userId,
                                'createdAt': this.createdAt.toString(),
                                'updatedAt': this.updatedAt.toString()
                              })

    // save nested resources
    await* [
      this.linkAttachments(),
      this.savePostedTo()
    ]

    await models.Timeline.publishPost(this)
    var stats = await models.Stats.findById(this.userId)
    await stats.addPost()

    return this
  }

  Post.prototype.savePostedTo = function() {
    return database.saddAsync(mkKey(['post', this.id, 'to']), this.timelineIds)
  }

  Post.prototype.update = async function(params) {
    this.updatedAt = new Date().getTime()
    this.body = params.body

    this.validate()

    await database.hmsetAsync(mkKey(['post', this.id]),
                              { 'body': this.body,
                                'updatedAt': this.updatedAt.toString()
                              })

    await pubSub.updatePost(this.id)

    return this
  }

  Post.prototype.destroy = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      // remove all comments
      that.getComments()
        .then(function(comments) {
          return Promise.map(comments, function(comment) {
            return comment.destroy()
          })
        })
        // decrement likes counter for users who liked this post
        .then(function() {
          return that.getLikeIds()
        })
        .then(function(userIds) {
          return Promise.map(userIds, function(userId) {
            return models.Stats.findById(userId).then(function(stats) {
              return stats.removeLike()
            })
          })
        })
        .then(function() {
          return pubSub.destroyPost(that.id)
        })
        .then(function() {
          Promise.all([
            // remove post from all timelines
            that.getTimelineIds()
              .then(function(timelineIds) {
                Promise.map(timelineIds, function(timelineId) {
                  return Promise.all([
                    database.sremAsync(mkKey(['post', that.id, 'timelines']), timelineId),
                    database.zremAsync(mkKey(['timeline', timelineId, 'posts']), that.id),
                  ])
                    .then(function() {
                      database.zcardAsync(mkKey(['timeline', timelineId, 'posts']))
                        .then(function(res) {
                          // that timeline is empty
                          if (res === 0)
                            database.delAsync(mkKey(['post', that.id, 'timelines']))
                        })
                    })
                })
              }),
            // delete posted to key
            database.delAsync(mkKey(['post', that.id, 'to'])),
            // delete likes
            database.delAsync(mkKey(['post', that.id, 'likes'])),
            // delete post
            database.delAsync(mkKey(['post', that.id]))
          ])
        })
        // delete orphaned keys
        .then(function() {
          database.scardAsync(mkKey(['post', that.id, 'timelines']))
            .then(function(res) {
              // post does not belong to any timelines
              if (res === 0)
                database.delAsync(mkKey(['post', that.id, 'timelines']))
            })
        })
        .then(function() { return database.delAsync(mkKey(['post', that.id, 'comments'])) })
        .then(function() { return models.Stats.findById(that.userId) })
        .then(function(stats) { return stats.removePost() })
        .then(function(res) { resolve(res) })
    })
  }

  Post.prototype.getCreatedBy = function() {
    return models.User.findById(this.userId)
  }

  Post.prototype.getSubscribedTimelineIds = function(groupOnly) {
    var that = this
    var timelineIds
    if (typeof groupOnly === 'undefined')
      groupOnly = false

    return new Promise(function(resolve, reject) {
      FeedFactory.findById(that.userId)
        .then(function(feed) {
          var feeds = [feed.getRiverOfNewsTimelineId()]
          if (!groupOnly)
            feeds.push(feed.getPostsTimelineId())
          return Promise.all(feeds)
        })
        .then(function(newTimelineIds) {
          timelineIds = newTimelineIds
          return that.getTimelineIds()
        })
        .then(function(newTimelineIds) {
          timelineIds = timelineIds.concat(newTimelineIds)
          timelineIds = _.uniq(timelineIds)
          resolve(timelineIds)
        })
    })
  }

  Post.prototype.getSubscribedTimelines = async function() {
    var timelineIds = await this.getSubscribedTimelineIds()
    var timelines = await* timelineIds.map((timelineId) => models.Timeline.findById(timelineId))
    this.subscribedTimelines = timelines
    return this.subscribedTimelines
  }

  Post.prototype.getTimelineIds = async function() {
    var timelineIds = await database.smembersAsync(mkKey(['post', this.id, 'timelines']))
    this.timelineIds = timelineIds || []
    return this.timelineIds
  }

  Post.prototype.getTimelines = async function() {
    var timelineIds = await this.getTimelineIds()
    var timelines = await* timelineIds.map((timelineId) => models.Timeline.findById(timelineId))
    this.timelines = timelines
    return this.timelines
  }

  Post.prototype.getPostedToIds = async function() {
    var timelineIds = await database.smembersAsync(mkKey(['post', this.id, 'to']))
    this.timelineIds = timelineIds || []
    return this.timelineIds
  }

  Post.prototype.getPostedTo = async function() {
    var timelineIds = await this.getPostedToIds()
    var timelines = await* timelineIds.map((timelineId) => models.Timeline.findById(timelineId))
    this.postedTo = timelines
    return this.postedTo
  }

  Post.prototype.getGenericFriendOfFriendTimelineIds = function(userId, type) {
    var that = this
    var timelineIds = []
    var user, feeds, groupOnly

    return new Promise(function(resolve, reject) {
      models.User.findById(userId)
        .then(function(newUser) {
          user = newUser
          return user['get' + type + 'Timeline']()
        })
        .then(function(timeline) {
          timelineIds.push(timeline.id)
          return timeline.getSubscribers()
        })
        .then(function(users) {
          feeds = users
          return that.getPostedToIds()
            .then(function(postedToIds) {
              return Promise.map(postedToIds, function(timelineId) {
                return models.Timeline.findById(timelineId)
                  .then(function(timeline) { return timeline.getUser() })
                  .then(function(user) { return user.isUser() })
              })
            })
        })
        .then(function(users) {
          // Adds the specified post to River of News if and only if
          // that post has been published to user's Post timeline,
          // otherwise this post will stay in group(s) timelines
          if (_.any(users, _.identity, true)) {
            groupOnly = false
            return Promise.map(feeds, function(user) {
              return user.getRiverOfNewsTimelineId()
            })
          } else {
            groupOnly = true
            return []
          }
        })
        .then(function(subscribedTimelineIds) {
          timelineIds = timelineIds.concat(subscribedTimelineIds)
          return that.getSubscribedTimelineIds(groupOnly)
        })
        .then(function(subscribedTimelineIds) {
          timelineIds = timelineIds.concat(subscribedTimelineIds)
          return user.getRiverOfNewsTimelineId()
        })
        .then(function(timelineId) {
          timelineIds.push(timelineId)
          timelineIds = _.uniq(timelineIds)
          resolve(timelineIds)
        })
    })
  }

  Post.prototype.getGenericFriendOfFriendTimelines = function(userId, type) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getGenericFriendOfFriendTimelineIds(userId, type)
        .then(function(timelineIds) {
          return Promise.map(timelineIds, function(timelineId) {
            return models.Timeline.findById(timelineId)
          })
        })
        .then(function(timelines) {
          resolve(timelines)
        })
    })
  }

  Post.prototype.getPostsFriendOfFriendTimelineIds = function(userId) {
    return this.getGenericFriendOfFriendTimelineIds(userId, 'Posts')
  }

  Post.prototype.getPostsFriendOfFriendTimelines = function(userId) {
    return this.getGenericFriendOfFriendTimelines(userId, 'Posts')
  }

  Post.prototype.getLikesFriendOfFriendTimelines = function(userId) {
    return this.getGenericFriendOfFriendTimelines(userId, 'Likes')
  }

  Post.prototype.getCommentsFriendOfFriendTimelines = function(userId) {
    return this.getGenericFriendOfFriendTimelines(userId, 'Comments')
  }

  Post.prototype.hide = function(userId) {
    var that = this

    return new Promise(function(resolve, reject) {
      let theUser

      models.User.findById(userId)
        .then(function(user) {
          theUser = user
          return pubSub.hidePost(user.id, that.id)
        })
        .then(function() { return theUser.getHidesTimelineId() })
        .then(function(timelineId) {
          return Promise.all([
            database.zaddAsync(mkKey(['timeline', timelineId, 'posts']), that.updatedAt, that.id),
            database.saddAsync(mkKey(['post', that.id, 'timelines']), timelineId)
          ])
        })
        .then(function(res) { resolve(res) })
    })
  }

  Post.prototype.unhide = function(userId) {
    var that = this

    return new Promise(function(resolve, reject) {
      let theUser

      models.User.findById(userId)
        .then(function(user) {
          theUser = user
          return pubSub.unhidePost(user.id, that.id)
        })
        .then(function() { return theUser.getHidesTimelineId() })
        .then(function(timelineId) {
          return Promise.all([
            database.zremAsync(mkKey(['timeline', timelineId, 'posts']), that.id),
            database.sremAsync(mkKey(['post', that.id, 'timelines']), timelineId)
          ])
        })
        .then(function(res) { resolve(res) })
    })
  }

  Post.prototype.addComment = async function(commentId) {
    var timelines = []
    var comment = await models.Comment.findById(commentId)

    if (!await this.isPrivate())
      timelines = await this.getCommentsFriendOfFriendTimelines(comment.userId)

    await* timelines.map((timeline) => timeline.updatePost(this.id))
    await database.rpushAsync(mkKey(['post', this.id, 'comments']), commentId)
    return pubSub.newComment(commentId)
  }

  Post.prototype.getOmittedComments = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.llenAsync(mkKey(['post', that.id, 'comments']))
        .then(function(length) {
          if (length > that.maxComments && length > 3 && that.maxComments != 'all') {
            that.omittedComments = length - that.maxComments
            return resolve(that.omittedComments)
          }

          return resolve(0)
        })
    })
  }

  Post.prototype.getCommentIds = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.llenAsync(mkKey(['post', that.id, 'comments']))
        .then(function(length) {
          if (length > that.maxComments && length > 3 && that.maxComments != 'all') {
            database.lrangeAsync(mkKey(['post', that.id, 'comments']), 0, that.maxComments - 2)
              .then(function(commentIds) {
                that.commentIds = commentIds
                return database.lrangeAsync(mkKey(['post', that.id, 'comments']), -1, -1)
              })
              .then(function(commentIds) {
                that.omittedComments = length - that.maxComments
                that.commentIds = that.commentIds.concat(commentIds)
                resolve(that.commentIds)
              })
          } else {
            database.lrangeAsync(mkKey(['post', that.id, 'comments']), 0, -1)
              .then(function(commentIds) {
                that.commentIds = commentIds
                resolve(commentIds)
              })
          }
        })
    })
  }

  Post.prototype.getComments = function() {
    var that = this
    var banIds

    return new Promise(function(resolve, reject) {
      models.User.findById(that.currentUser)
        .then(function(user) { return user ? user.getBanIds() : [] })
        .then(function(feedIds) {
          banIds = feedIds
          return that.getCommentIds()
        })
        .then(function(commentIds) {
          return Promise.map(commentIds, function(commentId) {
            return models.Comment.findById(commentId)
              .then(function(comment) {
                return banIds.indexOf(comment.userId) >= 0 ? null : comment
              })
          })
        })
        .then(function(comments) {
          // filter null comments
          that.comments = comments.filter(Boolean)
          resolve(that.comments)
        })
    })
  }

  Post.prototype.linkAttachments = function() {
    var that = this
    var attachments = that.attachments || []

    var attachmentPromises = attachments.map(function(attachmentId, index) {
      return new Promise(function(resolve, reject) {
        models.Attachment.findById(attachmentId)
          .then(function(attachment) {
            // Replace attachment ids with attachment objects
            that.attachments[index] = attachment

            // Update connections in DB
            return Promise.all([
              database.rpushAsync(mkKey(['post', that.id, 'attachments']), attachmentId),
              database.hsetAsync(mkKey(['attachment', attachmentId]), 'postId', that.id)
            ])
          })
          .then(function(res) { resolve(res) })
      })
    })

    return Promise.settle(attachmentPromises)
  }

  Post.prototype.getAttachmentIds = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.lrangeAsync(mkKey(['post', that.id, 'attachments']), 0, -1)
        .then(function(attachmentIds) {
          that.attachmentIds = attachmentIds
          resolve(attachmentIds)
        })
    })
  }

  Post.prototype.getAttachments = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.getAttachmentIds()
        .then(function(attachmentIds) {
          return Promise.map(attachmentIds, function(attachmentId) {
            return models.Attachment.findById(attachmentId)
          })
        })
        .then(function(attachments) {
          that.attachments = attachments
          resolve(that.attachments)
        })
    })
  }

  Post.prototype.getLikeIds = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.zcardAsync(mkKey(['post', that.id, 'likes']))
        .then(function(length) {
          if (length > that.maxLikes && that.maxLikes != 'all') {
            database.zscoreAsync(mkKey(['post', that.id, 'likes']), that.currentUser).bind({})
              .then(function(score) { this.includeUser = score && score >= 0 })
              .then(function() {
                return database.zrevrangeAsync(mkKey(['post', that.id, 'likes']), 0, that.maxLikes - 1)
              })
              .then(function(likeIds) {
                that.likeIds = likeIds
                that.omittedLikes = length - that.maxLikes

                if (this.includeUser) {
                  if (likeIds.indexOf(that.currentUser) == -1) {
                    that.likeIds = [that.currentUser].concat(that.likeIds.slice(0, -1))
                  } else {
                    that.likeIds = that.likeIds.sort(function(a, b) {
                      if (a == that.currentUser) return -1
                      if (b == that.currentUser) return 1
                    })
                  }
                }

                resolve(that.likeIds.slice(0, that.maxLikes))
              })
          } else {
            database.zrevrangeAsync(mkKey(['post', that.id, 'likes']), 0, -1)
              .then(function(likeIds) {
                var to = 0
                var from = _.findIndex(likeIds, function(user) { return user == that.currentUser })

                if (from > 0) {
                  likeIds.splice(to, 0, likeIds.splice(from, 1)[0])
                }
                that.likeIds = likeIds

                resolve(that.likeIds)
              })
          }
        })
    })
  }

  Post.prototype.getOmittedLikes = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      database.zcardAsync(mkKey(['post', that.id, 'likes']))
        .then(function(length) {
          if (length > that.maxLikes && that.maxLikes != 'all') {
            database.zscoreAsync(mkKey(['post', that.id, 'likes']), that.currentUser).bind({})
              .then(function(score) { this.includeUser = score && score >= 0 })
              .then(function() {
                return database.zrevrangeAsync(mkKey(['post', that.id, 'likes']), 0, that.maxLikes - 1)
              })
              .then(function(likeIds) {
                that.omittedLikes = length - that.maxLikes
                resolve(that.omittedLikes)
              })
          } else {
            resolve(0)
          }
        })
    })
  }

  Post.prototype.getLikes = function() {
    var that = this
    var banIds

    return new Promise(function(resolve, reject) {
      models.User.findById(that.currentUser)
        .then(function(user) { return user ? user.getBanIds() : [] })
        .then(function(feedIds) {
          banIds = feedIds
          return that.getLikeIds()
        })
        .then(function(userIds) {
          return Promise.map(userIds, function(userId) {
            return banIds.indexOf(userId) >= 0 ? null : models.User.findById(userId)
          })
        })
        .then(function(users) {
          // filter null comments
          that.likes = users.filter(Boolean)
          resolve(that.likes)
        })
    })
  }

  Post.prototype.isPrivate = async function() {
    var timelines = await this.getPostedTo()
    var arr = await* timelines.map(async (timeline) => {
      var owner = await models.User.findById(timeline.userId)

      if (timeline.isDirects() || owner.isPrivate === '1')
        return true

      // we do not have private feeds yet so user can open any
      // post if it's not a direct message
      return false
    })
    return _.every(arr, _.identity, true)
  }

  Post.prototype.addLike = async function(userId) {
    var timelines = []
    var user = await models.User.findById(userId)
    await user.validateCanLikePost(this.id)

    if (!await this.isPrivate())
      timelines = await this.getLikesFriendOfFriendTimelines(userId)

    var now = new Date().getTime()
    var promises = timelines.map((timeline) => timeline.updatePost(this.id, 'like'))
    promises.push(database.zaddAsync(mkKey(['post', this.id, 'likes']), now, userId))
    await* promises

    await pubSub.newLike(this.id, userId)
    var stats = await models.Stats.findById(userId)
    return stats.addLike()
  }

  Post.prototype.removeLike = function(userId) {
    var that = this

    return new Promise(function(resolve, reject) {
      let theUser

      models.User.findById(userId)
        .then(function(user) {
          theUser = user
          return user.validateCanUnLikePost(that.id)
        })
        .then(function() {
          return database.zremAsync(mkKey(['post', that.id, 'likes']), userId)
        })
        .then(function() {
          return theUser.getLikesTimelineId()
        })
        .then(function(timelineId) {
          Promise.all([
            database.zremAsync(mkKey(['timeline', timelineId, 'posts']), that.id),
            database.sremAsync(mkKey(['post', that.id, 'timelines']), timelineId)
          ])
        })
        .then(function() { return pubSub.removeLike(that.id, userId) })
        .then(function() { return models.Stats.findById(userId) })
        .then(function(stats) { return stats.removeLike() })
        .then(function(res) { resolve(res) })
        .catch(function(err) { reject(err) })
    })
  }

  Post.prototype.getCreatedBy = function() {
    return models.FeedFactory.findById(this.userId)
  }

  Post.prototype.isBannedFor = function(userId) {
    var that = this

    return new Promise(function(resolve, reject) {
      models.User.findById(userId)
        .then(function(user) { return user.getBanIds() })
        .then(function(banIds) { return banIds.indexOf(that.userId) })
        .then(function(index) { resolve(index >= 0) })
    })
  }

  Post.prototype.isHiddenIn = function(timelineId) {
    var that = this

    return new Promise(function(resolve, reject) {
      models.Timeline.findById(timelineId)
        .then(function(timeline) {
          if (!(timeline.isRiverOfNews() || timeline.isHides()))
            resolve(false)

          return timeline.getUser()
        })
        .then(function(user) { return user.getHidesTimelineId() })
        .then(function(timelineId) {
          return database.zscoreAsync(mkKey(['timeline', timelineId, 'posts']), that.id)
        })
        .then(function(score) { resolve(score && score >= 0) })
    })
  }

  Post.prototype.validateCanShow = async function(userId) {
    var timelines = await this.getPostedTo()

    var arr = await* timelines.map(async function(timeline) {
      // owner can read her posts
      if (timeline.userId === userId)
        return true

      // if post is already in user's feed then she can read it
      if (timeline.isDirects())
        return timeline.userId === userId

      // this is a public feed, anyone can read public posts, this is
      // a free country
      var user = await timeline.getUser()
      if (user.isPrivate !== '1')
        return true

      // otherwise user can view post if and only if she is subscriber
      var userIds = await timeline.getSubscriberIds()
      return userIds.indexOf(userId) >= 0
    })

    return _.reduce(arr, function(acc, x) { return acc || x }, false)
  }

  return Post
}
