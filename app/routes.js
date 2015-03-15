"use strict";

var SessionRoute = require('./routes/api/v1/SessionRoute')
  , UsersRoute = require('./routes/api/v1/UsersRoute')

module.exports = function(app) {
  UsersRoute.addRoutes(app)
  SessionRoute.addRoutes(app)
}

