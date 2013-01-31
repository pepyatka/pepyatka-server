var models = require('../models');

exports.addRoutes = function(app) {
  app.get('/v1/users/:userId', function(req, res) {
    models.User.findById(req.params.userId, function(err, user) {
      if (err) return res.jsonp({}, 422)

      user.toJSON(function(err, json) { res.jsonp(json) })
    })
  })

  app.get('/v1/users/:userId/subscribe', function(req, res) {
    req.user.subscribeTo(req.params.userId, function(err, r) {
      if (err) return res.jsonp({}, 422)

      res.jsonp({})
    })
  })

  app.get('/v1/users/:userId/unsubscribe', function(req, res) {
    req.user.unsubscribeTo(req.params.userId, function(err, r) {
      if (err) return res.jsonp({}, 422)

      res.jsonp({})
    })
  })
}
