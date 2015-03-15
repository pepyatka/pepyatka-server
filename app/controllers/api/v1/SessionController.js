"use strict";

var passport = require('passport')
  , jwt = require('jsonwebtoken')
  , config = require('../../../../config/config').load()

exports.addController = function(app) {
  var SessionController = function() {
  }

  SessionController.create = function(req, res) {
    passport.authenticate('local', function(err, user) {
      if (err || !user)
        return res.status(401).jsonp({ err: 'user ' + req.body.username + ' doesn\'t exist', status: 'fail'})

      var secret = config.secret
      var token = jwt.sign({ userId: user.id }, secret)
      user.token = token

      res.send(JSON.stringify(user))
    })(req, res)
  }

  SessionController.destroy = function(req, res) {
    res.redirect("/")
  }

  return SessionController
}
