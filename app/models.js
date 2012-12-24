redis = require('../db')
  , db = redis.connect()

exports.User = require('./models/user').add_model(db);
