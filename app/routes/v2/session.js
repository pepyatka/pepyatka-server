var models = require('../../models')
  , passport = require('passport')
  , jwt = require('jsonwebtoken')
  , UserSerializer = models.UserSerializerV2
  , config = require('../../../conf/envLocal')

exports.addRoutes = function(app) {
  if (!conf.remoteUser) {
    app.post('/v2/session', function(req, res, next) {
      passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) {
          return res.jsonp(401, { err: 'user ' + req.body.username + ' doesn\'t exist', status: 'fail' }) 
        }

        req.logIn(user, function(err) {
          if (err) { return next(err); }

          var secret = config.getAppConfig()['secret']
          var token = jwt.sign({ userId: user.id }, secret);

          new UserSerializer(user).toJSON(function(err, userJSON) {
            return res.jsonp({err: null, status: 'success', user: userJSON, token: token });
          })
        })
      })(req, res, next);
    })

    app.get('/logout', function(req, res){
      req.logout()
      res.redirect("/")
    })
  }
}
