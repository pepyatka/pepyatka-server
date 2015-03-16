"use strict";

var models = require('../../../models')
  , jwt = require('jsonwebtoken')
  , config = require('../../../../config/config').load()

exports.addController = function(app) {
  var UsersController = function() {
  }

  UsersController.create = function(req, res) {
    var newUser = new models.User({
      username: req.body.username,
      password: req.body.password
    })

    models.User.findByUsername(newUser.username)
      .then(function() { return newUser.create() })
      .then(function(user) {
        var secret = config.secret
        var token = jwt.sign({ userId: user.id }, secret);
        user.token = token

        res.jsonp(user)
      })
      .catch(function(e) {
        res.status(401).jsonp({ err: 'user ' + newUser.username + ' exists', status: 'fail'})
      })
  }

  return UsersController
}
