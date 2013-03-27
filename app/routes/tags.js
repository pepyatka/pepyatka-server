var models = require('../models')

exports.addRoutes = function(app, connections) {
  app.get('/v1/tags', function(req, res) {
    models.Tag.findAll(function(err, tags) {
      res.jsonp(tags)
    })
  });
}
