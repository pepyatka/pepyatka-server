var models = require('../models')
  , passport = require('passport')

exports.addRoutes = function(app) {
  app.get('/session', function(req, res){
    res.render('session');
  });

  app.post('/v1/session', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
      if (err) { return next(err); }
      if (!user) { return res.redirect('/session'); }
      req.logIn(user, function(err) {
        if (err) { return next(err); }
        // everything is OK - let's redirect user to river of news
        return res.redirect('/');
      });
    })(req, res, next);
  })

  app.get('/logout', function(req, res){
    req.logout()
    res.redirect("/")
  });
}
