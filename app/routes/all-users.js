var models = require('../models');

exports.addRoutes = function(app) {
  app.get('/:username', function(req, res) {
    res.redirect('/#/users/' + req.params.username)
  });
}
