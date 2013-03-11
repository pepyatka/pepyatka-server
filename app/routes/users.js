var models = require('../models');

exports.addRoutes = function(app) {
  var userSerializer = {
    select: ['id', 'username']
  }

  app.get('/v1/users', function(req, res) {
    if (!req.user) 
      return res.jsonp({})

    var userId = req.user.id

    if (userId)
      res.redirect('/v1/users/' + userId)
    else
      res.jsonp({}, 404)
  })

  app.get('/v1/users/:userId', function(req, res) {
    models.User.findById(req.params.userId, function(err, user) {
      if (err) return res.jsonp({}, 422)

      user.toJSON(userSerializer, function(err, json) { res.jsonp(json) })
    })
  })
}
