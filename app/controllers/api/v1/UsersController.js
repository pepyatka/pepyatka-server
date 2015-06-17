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
  , formidable = require('formidable')

exports.addController = function(app) {
  /**
   * @constructor
   */
  var UsersController = function() {
  }

  UsersController.create = function(req, res) {
    var params = {
      username: req.body.username,
      email: req.body.email
    }

    params.hashedPassword = req.body.password_hash
    if (!config.acceptHashedPasswordsOnly) {
      params.password = req.body.password
    }

    var newUser = new models.User(params)

    return newUser.create()
      .then(function(user) {
        var secret = config.secret
        var authToken = jwt.sign({ userId: user.id }, secret)

        new MyProfileSerializer(user).toJSON(function(err, json) {
          return res.jsonp(_.extend(json, { authToken: authToken }))
        })
      })
      .catch(exceptions.reportError(res))
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

  UsersController.subscribers = async function(req, res) {
    var username = req.params.username
      , user

    try {
      user = await models.User.findByUsername(username)
    } catch (e) {
      res.status(404).send({})
      return
    }

    try {
      var timeline = await user.getPostsTimeline()
      var subscribers = await timeline.getSubscribers()

      var jsonPromises = subscribers.map(function(subscriber){
        return new SubscriberSerializer(subscriber).promiseToJSON()
      })

      var json = _.reduce(jsonPromises, async function (memo, obj) {
        memo.subscribers.push((await obj).subscribers)
        return memo
      }, { subscribers: []})

      res.jsonp(await json)
    } catch (e) {
      res.status(422).send({})
    }
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
            memo.subscribers[user.id] = user
            return memo
          }, { subscriptions: [], subscribers: {} })
          json.subscribers = _.values(json.subscribers)
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(422).send({}) })
  }

  UsersController.ban = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    var username = req.params.username
    req.user.ban(username)
      .then(function(status) {
        res.jsonp({ status: status })
      })
      .catch(exceptions.reportError(res))
  }

  UsersController.unban = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    var username = req.params.username
    req.user.unban(username)
      .then(function(status) {
        res.jsonp({ status: status })
      })
      .catch(exceptions.reportError(res))
  }

  UsersController.subscribe = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    var username = req.params.username
    models.User.findByUsername(username)
      .then(function(user) { return user.getPostsTimelineId() })
      .then(function(timelineId) {
        return req.user.validateCanSubscribe(timelineId)
      })
      .then(function(timelineId) { return req.user.subscribeTo(timelineId) })
      .then(function(status) {
        new MyProfileSerializer(req.user).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(exceptions.reportError(res))
  }

  UsersController.unsubscribe = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    var username = req.params.username
    models.User.findByUsername(username)
      .then(function(user) { return user.getPostsTimelineId() })
      .then(function(timelineId) {
        return req.user.validateCanUnsubscribe(timelineId)
      })
      .then(function(timelineId) { return req.user.unsubscribeTo(timelineId) })
      .then(function(status) {
        new MyProfileSerializer(req.user).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(exceptions.reportError(res))
  }

  UsersController.update = function(req, res) {
    if (!req.user || req.user.id != req.params.userId)
      return res.status(401).jsonp({ err: 'Not found' })

    var attrs = {
      screenName: req.body.user.screenName,
      email: req.body.user.email,
      isPrivate: req.body.user.isPrivate
    }
    req.user.update(attrs)
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

    var currentPassword = req.body.currentPassword || ''
    req.user.validPassword(currentPassword)
      .then(function(valid) {
        if (valid)
          return req.user.updatePassword(req.body.password, req.body.passwordConfirmation)
        else
          return Promise.reject(new Error('Your old password is not valid'))
      })
      .then(function(user) { res.jsonp({ message: 'Your password has been changed' }) })
      .catch(exceptions.reportError(res))
  }

  UsersController.updateProfilePicture = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    var form = new formidable.IncomingForm()

    form.on('file', function(inputName, file) {
      req.user.updateProfilePicture(file)
        .then(function() {
          res.jsonp({ message: 'Your profile picture has been updated' })
        })
        .catch(exceptions.reportError(res))
    })

    form.parse(req)
  }

  return UsersController
}
