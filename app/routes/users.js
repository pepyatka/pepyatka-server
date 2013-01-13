var models = require('../models');

exports.addRoutes = function(app) {
  app.get('/signup', function(req, res){
    res.render('users/signup');
  });

  app.post('/signup', function(req, res){
    var newUser = new models.User({
      username: req.body.username,
      password: req.body.password
    })
    newUser.save(function(user) {
      req.session.userId = user.id

      res.redirect('/')
    })
  });
}
