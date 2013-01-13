var models = require('../models')
  , passport = require('passport')

exports.addRoutes = function(app) {
  app.get('/session', function(req, res){
    res.render('session');
  });

  app.post('/session',
           passport.authenticate('local', {
             successRedirect: '/',
             failureRedirect: '/session',
             failureFlash: true,
             successFlash: true
           }));

  app.get('/logout', function(req, res){
    req.session.destroy();
    res.redirect("/")
  });
}
