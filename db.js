var redis = require('redis')
  , db = redis.createClient();

exports.connect = function() {
  if (!db) db = redis.createClient()
  return db
}

db.on("error", function (err) {
  console.log("error event - " + db.host + ":" + db.port + " - " + err);
});

exports.disconnect = function() {
  redis.end();
  db = null
}
