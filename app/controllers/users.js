var models = require('../models');

exports.add_routes = function(app) {
  app.get('/users', function(req, res){
    res.send("respond with a resource");
  });
}
