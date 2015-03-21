"use strict";

var models = require('../../../models')
  , jwt = require('jsonwebtoken')
  , config = require('../../../../config/config').load()
  , UserSerializer = models.UserSerializer
  , _ = require('underscore')

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
        res.status(401).jsonp({ err: 'user ' + newUser.username + ' exists', status: 'fail'})
      })
  }

  UsersController.whoami = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found', status: 'fail'})

    new UserSerializer(req.user).toJSON(function(err, json) {
      return res.jsonp(json)
    })
  }

  return UsersController
}
