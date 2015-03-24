"use strict";

var models = require('../../../models')
  , jwt = require('jsonwebtoken')
  , config = require('../../../../config/config').load()
  , UserSerializer = models.UserSerializer
  , SubscriberSerializer = models.SubscriberSerializer
  , _ = require('underscore')
  , Promise = require('bluebird')
  , async = require('async')

exports.addController = function(app) {
  var UsersController = function() {
  }

  UsersController.create = function(req, res) {
    var newUser = new models.User({
      username: req.body.username,
      password: req.body.password
    })

    return newUser.create()
      .then(function(user) {
        var secret = config.secret
        var authToken = jwt.sign({ userId: user.id }, secret);

        new UserSerializer(user).toJSON(function(err, json) {
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

    new UserSerializer(req.user).toJSON(function(err, json) {
      return res.jsonp(json)
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

  return UsersController
}
