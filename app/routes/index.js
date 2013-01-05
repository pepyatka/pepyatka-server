var models = require('../models');

exports.addRoutes = function(app, connections) {
  app.get('/', function(req, res) {
    res.render('./home')
  });
}
