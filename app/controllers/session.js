var redis = require('../../db')
  , db = redis.connect()

exports.add_routes = function(app) {
  app.get('/session', function(req, res){
    res.render('session');
  });

  app.post('/session', function(req, res){
    req.session.user_id = db.get('username:anonymous:uid');
    res.redirect("/")
  });

  app.get('/logout', function(req, res){
    req.session.destroy();
    res.redirect("/")
  });
}
