var models = require('../models');

exports.addRoutes = function(app) {
  app.use(function(req, res) {
    res.render('./home', {csrf_token: req.session._csrf})
  })
}
