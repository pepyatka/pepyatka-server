var models = require('../models');

exports.add_routes = function(app) {
  app.get('/session', function(req, res){
    res.render('session');
  });

  app.post('/session', function(req, res){
    models.User.anon(function(value) {
      req.session.user_id = value;

      res.redirect("/")
    });      
  });

  app.get('/logout', function(req, res){
    req.session.destroy();
    res.redirect("/")
  });
}
