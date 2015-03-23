"use strict";

var passport = require('passport')
  , jwt = require('jsonwebtoken')
  , config = require('../../../../config/config').load()
  , models = require('../../../models')
  , UserSerializer = models.UserSerializer
  , _ = require('underscore')

exports.addController = function(app) {
  var SessionController = function() {
  }

  SessionController.create = function(req, res) {
    passport.authenticate('local', function(err, user) {
      if (err || !user)
        return res.status(401).jsonp({ err: 'user ' + req.body.username + ' doesn\'t exist'})

      var secret = config.secret
      var authToken = jwt.sign({ userId: user.id }, secret)

      new UserSerializer(user).toJSON(function(err, json) {
        return res.jsonp(_.extend(json, { authToken: authToken }))
      })
    })(req, res)
  }

  return SessionController
}
