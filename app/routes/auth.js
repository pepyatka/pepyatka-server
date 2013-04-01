var models = require('../models');

exports.addRoutes = function(app) {
  app.get('/signup', function(req, res) {
    res.render('users/signup');
  });

  app.post('/signup', function(req, res) {
    var newUser = new models.User( {
      username: req.body.username,
      password: req.body.password
    })

    models.User.findByUsername(newUser.username, function(err, user) {
      if (user === null) {
        newUser.save(function(err, user) {
          req.logIn(user, function(err) {
            res.redirect('/')
          })
        })
      } else {
        res.redirect('/signup')
      }
    })
  })
}
