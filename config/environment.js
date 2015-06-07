"use strict";

var Promise = require('bluebird')
  , redis = require('./database')
  , database = redis.connect()
  , config = require('./config').load()
  , passport = require('passport')
  , bodyParser = require('body-parser')
  , auth = require('./initializers/passport').init(passport)
  , env = process.env.NODE_ENV || 'development'
  , morgan = require('morgan')
  , fs = require('fs')
  , winston = require('winston')
  , origin = require('./initializers/origin')
  , methodOverride = require('method-override')

var selectEnvironment = function(app) {
  return new Promise(function(resolve, reject) {
    var logger = new (winston.Logger)({
      transports: [
        new (winston.transports.Console)({ 'timestamp':true })
      ]
    })
    app.logger = logger
    app.config = config

    app.set('redisdb', config.database)
    app.set('port', process.env.PORT || config.port)

    redis.selectDatabase()
      .then(function() { resolve(app) })
  })
}

exports.init = function(app) {
  app.use(bodyParser.json({limit: config.attachments.fileSizeLimit}))
  app.use(bodyParser.urlencoded({limit: config.attachments.fileSizeLimit, extended: true}))
  app.use(passport.initialize())
  app.use(origin.init)
  app.use(methodOverride(function(req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      var method = req.body._method
      delete req.body._method
      return method
    }
  }))

  var accessLogStream = fs.createWriteStream(__dirname + '/../log/' + env + '.log', {flags: 'a'})
  app.use(morgan('combined', {stream: accessLogStream}))

  return new Promise(function(resolve, reject) {
    selectEnvironment(app)
      .then(function(app) { resolve(app) })
  })
}
