var models = require('../models');

exports.addRoutes = function(app) {
  app.get('/users', function(req, res){
    res.send("respond with a resource");
  });
}
