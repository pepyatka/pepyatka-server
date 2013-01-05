var models = require('../models');

exports.addRoutes = function(app) {
  app.get('/session', function(req, res){
    res.render('session');
  });

  app.post('/session', function(req, res){
    models.User.anon(function(value) {
      req.session.userId = value;

      res.redirect("/")
    });      
  });

  app.get('/logout', function(req, res){
    req.session.destroy();
    res.redirect("/")
  });
}
