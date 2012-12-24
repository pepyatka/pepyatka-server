var redis = require('redis')
  , db = redis.createClient();

exports.connect = function() {
  if (!db) db = redis.createClient()
  return db
}

exports.disconnect = function() {
  redis.end();
  db = null
}
