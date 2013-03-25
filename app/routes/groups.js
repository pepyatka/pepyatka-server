var models = require('../models')

exports.addRoutes = function(app) {
  app.post('/v1/groups', function(req, res) {
    res.jsonp({}, 422)
  })
}
