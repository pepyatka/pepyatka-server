var models = require('../models');

exports.addRoutes = function(app) {
  app.get('/v1/users/:userId', function(req, res) {
    models.User.findById(req.params.userId, function(err, user) {
      if (err) return res.jsonp({}, 422)

      user.toJSON({}, function(err, json) { res.jsonp(json) })
    })
  })
}
