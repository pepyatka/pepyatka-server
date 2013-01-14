var models = require('../models')
  , passport = require('passport')

exports.addRoutes = function(app) {
  app.get('/session', function(req, res){
    res.render('session');
  });

  app.post('/session', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
      if (err) { return next(err); }
      if (!user) { return res.redirect('/session'); }
      req.logIn(user, function(err) {
        if (err) { return next(err); }
        return res.redirect('/#/users/' + user.username);
      });
    })(req, res, next);
  })

  app.get('/logout', function(req, res){
    req.logout()
    res.redirect("/")
  });
}
