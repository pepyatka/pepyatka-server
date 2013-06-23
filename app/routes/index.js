var models = require('../models');

exports.addRoutes = function(app) {
  app.get('/api/v1/version', function(req, res) {
    res.json({status: 'All your base are belong to us!11',
              version: '0.0.6'})
  })

  app.use(function(req, res) {
    res.render('./home', {csrf_token: req.session._csrf})
  })
}
