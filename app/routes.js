"use strict";

var SessionRoute = require('./routes/api/v1/SessionRoute')
  , UsersRoute = require('./routes/api/v1/UsersRoute')
  , TimelinesRoute = require('./routes/api/v1/TimelinesRoute')
  , PostsRoute = require('./routes/api/v1/PostsRoute')

var Promise = require('bluebird')
  , jwt = require('jsonwebtoken')
  , config = require('../config/config').load()
  , models = require('./models')

Promise.promisifyAll(jwt)

var findUser = function(req, res, next) {
  if (req.body.authToken || req.query.authToken) {
    var secret = config.secret
    var authToken = req.body.authToken || req.query.authToken

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
  SessionRoute.addRoutes(app)

  app.all('/*', findUser)
  UsersRoute.addRoutes(app)
  TimelinesRoute.addRoutes(app)
  PostsRoute.addRoutes(app)
}
