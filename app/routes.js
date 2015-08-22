"use strict";

var SessionRoute = require('./routes/api/v1/SessionRoute')
  , UsersRoute = require('./routes/api/v1/UsersRoute')
  , TimelinesRoute = require('./routes/api/v1/TimelinesRoute')
  , PostsRoute = require('./routes/api/v1/PostsRoute')
  , AttachmentsRoute = require('./routes/api/v1/AttachmentsRoute')
  , CommentsRoute = require('./routes/api/v1/CommentsRoute')
  , GroupsRoute = require('./routes/api/v1/GroupsRoute')
  , PasswordsRoute = require('./routes/api/v1/PasswordsRoute')

var Promise = require('bluebird')
  , jwt = require('jsonwebtoken')
  , config = require('../config/config').load()
  , models = require('./models')
  , _ = require('lodash')

Promise.promisifyAll(jwt)

var findUser = async function(req, res, next) {
  var authToken = req.headers['x-authentication-token'] ||
      req.body.authToken || req.query.authToken

  if (authToken) {
    try {
      let decoded = await jwt.verifyAsync(authToken, config.secret)
      let user = await models.User.findById(decoded.userId)

      req.user = user
    } catch(e) {
    }
  }

  // set currentUser to anonymous user
  if (_.isEmpty(req.user)) {
    req.user = await models.User.findByUsername('anonymous')
  }

  next()
}

module.exports = function(app) {
  app.use(require('express').static(__dirname + '/../public'))

  app.options('/*', function(req, res) { res.status(200).send({}) })

  SessionRoute.addRoutes(app)
  PasswordsRoute.addRoutes(app)

  app.all('/*', findUser)
  UsersRoute.addRoutes(app)
  GroupsRoute.addRoutes(app)
  TimelinesRoute.addRoutes(app)
  PostsRoute.addRoutes(app)
  AttachmentsRoute.addRoutes(app)
  CommentsRoute.addRoutes(app)
}
