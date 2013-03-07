var models = require('../models');

exports.addRoutes = function(app) {
  app.get('/:username', function(req, res) {
    res.render('./home')
  });

  app.get('/', function(req, res) {
    res.render('./home')
  });
}
