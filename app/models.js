var redis = require('../db')
  , db = redis.connect()

exports.User       = require('./models/user').addModel(db);
exports.Group      = require('./models/group').addModel(db);
exports.Post       = require('./models/post').addModel(db);
exports.Comment    = require('./models/comment').addModel(db);
exports.Timeline   = require('./models/timeline').addModel(db);
exports.Attachment = require('./models/attachment').addModel(db);
exports.Tag        = require('./models/tag').addModel(db);
exports.Stats      = require('./models/stats').addModel(db);
