"use strict";

exports.SessionController = require('./controllers/api/v1/SessionController').addController()
exports.UsersController = require('./controllers/api/v1/UsersController').addController()
exports.TimelinesController = require('./controllers/api/v1/TimelinesController').addController()
exports.PostsController = require('./controllers/api/v1/PostsController').addController()
exports.CommentsController = require('./controllers/api/v1/CommentsController').addController()
