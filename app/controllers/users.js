var redis = require('../../db')
  , db = redis.connect()

exports.add_routes = function(app) {
  app.get('/users', function(req, res){
    res.send("respond with a resource");
  });
}
