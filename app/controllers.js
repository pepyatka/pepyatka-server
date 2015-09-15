"use strict";

exports.BookmarkletController = require('./controllers/api/v1/BookmarkletController').addController()
exports.SessionController = require('./controllers/api/v1/SessionController').addController()
exports.UsersController = require('./controllers/api/v1/UsersController').addController()
exports.GroupsController = require('./controllers/api/v1/GroupsController').addController()
exports.TimelinesController = require('./controllers/api/v1/TimelinesController').addController()
exports.PostsController = require('./controllers/api/v1/PostsController').addController()
exports.AttachmentsController = require('./controllers/api/v1/AttachmentsController').addController()
exports.CommentsController = require('./controllers/api/v1/CommentsController').addController()
exports.PasswordsController = require('./controllers/api/v1/PasswordsController').addController()
exports.FeedFactoriesController = require('./controllers/api/v1/FeedFactoriesController').addController()
