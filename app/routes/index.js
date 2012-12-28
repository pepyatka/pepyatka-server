var models = require('../models');

exports.add_routes = function(app, connections) {
  app.get('/', function(req, res) {
    res.render('./home')
  });
}
