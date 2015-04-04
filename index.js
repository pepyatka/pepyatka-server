"use strict";

var express = require('express')
  , app = express()
  , environment = require('./config/environment')
  , http = require('http')
  , server = http.createServer(app)

module.exports = app

environment.init(app)
  .then(function(app) {
    var pubsub = require('./app/pubsub').init().listen(server, app)
    var routes = require('./app/routes')(app)

    server.listen(app.get('port'), function() {
      app.logger.info("Express server listening on port " + app.get('port'));
      app.logger.info("Server is running on " + (process.env.NODE_ENV || "development") + " mode")
    })
  })
