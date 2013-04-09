var models = require('../models');

exports.addRoutes = function(app) {
  app.post('/v1/signup', function(req, res) {
    var newUser = new models.User( {
      username: req.body.username,
      password: req.body.password
    })

    models.User.findByUsername(newUser.username, function(err, user) {
      if (user !== null)
        return res.jsonp({ err: 'user ' + user.username + ' exists', status: 'fail'})

      newUser.save(function(err, user) {
        req.logIn(user, function(err) {
          res.jsonp({ err: null, status: 'success'})
        })
      })
    })
  })
}
