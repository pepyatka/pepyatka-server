"use strict";

var SessionRoute = require('./routes/api/v1/SessionRoute')
  , UsersRoute = require('./routes/api/v1/UsersRoute')
  , TimelinesRoute = require('./routes/api/v1/TimelinesRoute')
  , PostsRoute = require('./routes/api/v1/PostsRoute')
  , CommentsRoute = require('./routes/api/v1/CommentsRoute')
  , GroupsRoute = require('./routes/api/v1/GroupsRoute')

var Promise = require('bluebird')
  , jwt = require('jsonwebtoken')
  , config = require('../config/config').load()
  , models = require('./models')

Promise.promisifyAll(jwt)

var findUser = function(req, res, next) {
  var authToken = req.headers['x-authentication-token'] ||
      req.body.authToken || req.query.authToken
  if (authToken) {
    var secret = config.secret

    jwt.verifyAsync(authToken, secret)
      .then(function(decoded) {
        return models.User.findById(decoded.userId)
      })
      .then(function(user) {
        if (user) req.user = user
        next()
      })
      .catch(function(e) { next() })
  } else {
    next()
  }
}

module.exports = function(app) {
  app.use(require('express').static(__dirname + '/../public'))

  app.options('/*', function(req, res) { res.status(200).send({}) })

  SessionRoute.addRoutes(app)

  app.all('/*', findUser)
  UsersRoute.addRoutes(app)
  GroupsRoute.addRoutes(app)
  TimelinesRoute.addRoutes(app)
  PostsRoute.addRoutes(app)
  CommentsRoute.addRoutes(app)
}
