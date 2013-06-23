var models = require('../models');

exports.addRoutes = function(app) {
  var userSerializer = { select: ['id', 'username'] }

  if (!conf.remoteUser) {
    app.post('/v1/signup', function(req, res) {
      var newUser = new models.User( {
        username: req.body.username,
        password: req.body.password
      })

      models.User.findByUsername(newUser.username, function(err, user) {
        if (user !== null)
          return res.jsonp({ err: 'user ' + user.username + ' exists', status: 'fail'})

        newUser.create(function(err, user) {
          if (err) return res.jsonp({}, 422)

          req.logIn(user, function(err) {
            user.toJSON(userSerializer, function(err, userJSON) {
              res.jsonp({ err: null, status: 'success', user: userJSON })
            })
          })
        })
      })
    })
  }
}
