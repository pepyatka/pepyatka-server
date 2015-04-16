"use strict";

var models = require('../../../models')
  , jwt = require('jsonwebtoken')
  , config = require('../../../../config/config').load()
  , UserSerializer = models.UserSerializer
  , MyProfileSerializer = models.MyProfileSerializer
  , SubscriberSerializer = models.SubscriberSerializer
  , SubscriptionSerializer = models.SubscriptionSerializer
  , _ = require('lodash')
  , Promise = require('bluebird')
  , async = require('async')
  , exceptions = require('../../../support/exceptions')

exports.addController = function(app) {
  var UsersController = function() {
  }

  UsersController.create = function(req, res) {
    var newUser = new models.User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password
    })

    return newUser.create()
      .then(function(user) {
        var secret = config.secret
        var authToken = jwt.sign({ userId: user.id }, secret)

        new MyProfileSerializer(user).toJSON(function(err, json) {
          return res.jsonp(_.extend(json, { authToken: authToken }))
        })
      })
      .catch(function(e) {
        res.status(422).jsonp({ err: 'user ' + newUser.username + ' exists' })
      })
  }

  UsersController.whoami = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    new MyProfileSerializer(req.user).toJSON(function(err, json) {
      return res.jsonp(json)
    })
  }

  UsersController.show = function(req, res) {
    var username = req.params.username

    models.FeedFactory.findByUsername(username)
      .then(function(feed) {
        new UserSerializer(feed).toJSON(function(err, json) {
          return res.jsonp(json)
        })
      })
  }

  UsersController.subscribers = function(req, res) {
    var username = req.params.username

    models.User.findByUsername(username)
      .then(function(user) { return user.getPostsTimeline() })
      .then(function(timeline) { return timeline.getSubscribers() })
      .then(function(subscribers) {
        async.map(subscribers, function(subscriber, callback) {
          new SubscriberSerializer(subscriber).toJSON(function(err, json) {
            callback(err, json)
          })
        }, function(err, json) {
          json = _.reduce(json, function(memo, obj) {
            memo.subscribers.push(obj.subscribers)
            return memo
          }, { subscribers: []})
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(422).send({}) })
  }

  UsersController.subscriptions = function(req, res) {
    var username = req.params.username

    models.User.findByUsername(username)
      .then(function(user) { return user.getSubscriptions() })
      .then(function(subscriptions) {
        async.map(subscriptions, function(subscription, callback) {
          new SubscriptionSerializer(subscription).toJSON(function(err, json) {
            callback(err, json)
          })
        }, function(err, json) {
          json = _.reduce(json, function(memo, obj) {
            memo.subscriptions.push(obj.subscriptions)
            var user = obj.subscribers[0]
            memo.users[user.id] = user
            return memo
          }, { subscriptions: [], users: {} })
          json.users = _.values(json.users)
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(422).send({}) })
  }

  UsersController.subscribe = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    var username = req.params.username
    models.User.findByUsername(username)
      .then(function(user) { return user.getPostsTimelineId() })
      .then(function(timelineId) { return req.user.subscribeTo(timelineId) })
      .then(function(status) { res.jsonp({}) })
      .catch(function(e) { res.status(422).send({}) })
  }

  UsersController.unsubscribe = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    var username = req.params.username
    models.User.findByUsername(username)
      .then(function(user) { return user.getPostsTimelineId() })
      .then(function(timelineId) { return req.user.unsubscribeTo(timelineId) })
      .then(function(status) { res.jsonp({}) })
      .catch(function(e) { res.status(422).send({}) })
  }

  UsersController.update = function(req, res) {
    if (!req.user || req.user.id != req.params.userId)
      return res.status(401).jsonp({ err: 'Not found' })

    var attrs = {
      screenName: req.body.user.screenName,
      email: req.body.user.email,
      isPrivate: req.body.user.isPrivate
    }
    models.User.findById(req.params.userId)
      .then(function(user) { return user.update(attrs) })
      .then(function(user) {
        new MyProfileSerializer(user).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(exceptions.reportError(res))
  }

  UsersController.updatePassword = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    req.user.validPassword(req.body.currentPassword)
      .then(function(valid) {
        if (valid)
          return req.user.updatePassword(req.body.password, req.body.passwordConfirmation)
        else
          return Promise.reject('Invalid')
      })
      .then(function(user) { res.jsonp({}) })
      .catch(function(e) { res.status(422).send({}) })
  }

  return UsersController
}
