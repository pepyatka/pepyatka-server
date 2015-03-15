"use strict";

var redis = require('./database')
  , database = redis.connect()
  , logger = require('winston')
  , config = require('./config').load()
  , passport = require('passport')
  , bodyParser = require('body-parser')
  , auth = require('./initializers/passport').init(passport)

var selectEnvironment = function(app) {
  return new Promise(function(resolve, reject) {
    app.logger = logger
    app.config = config

    app.set('redisdb', config.database)
    app.set('port', process.env.PORT || config.port)

    redis.selectDatabase()
      .then(function() { resolve(app) })
  })
}

exports.init = function(app) {
  app.use(bodyParser.urlencoded({ extended: false}))
  app.use(passport.initialize())

  return new Promise(function(resolve, reject) {
    selectEnvironment(app)
      .then(function(app) {

        resolve(app)
      })
  })
}
