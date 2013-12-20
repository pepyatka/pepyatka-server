var models = require('../models')
  , passport = require('passport')
  , UserSerializer = models.UserSerializer;

exports.addRoutes = function(app) {
  if (!conf.remoteUser) {
    app.post('/v1/session', function(req, res, next) {
      passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.jsonp({err: 'user ' + req.body.username + ' doesn\'t exist', status: 'fail' }) }
        req.logIn(user, function(err) {
          if (err) { return next(err); }
          // everything is OK - let's redirect user to river of news
          new UserSerializer(user).toJSON(function(err, userJSON) {
            return res.jsonp({err: null, status: 'success', user: userJSON });
          });
        });
      })(req, res, next);
    })

    app.get('/logout', function(req, res){
      req.logout()
      res.redirect("/")
    });
  }
}
