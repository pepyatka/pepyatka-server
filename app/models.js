redis = require('../db')
  , db = redis.connect()

exports.User = require('./models/user').add_model(db);
exports.Post = require('./models/post').add_model(db);
exports.Comment = require('./models/comment').add_model(db);
exports.Timeline = require('./models/timeline').add_model(db);
