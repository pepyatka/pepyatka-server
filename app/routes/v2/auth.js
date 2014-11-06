var models = require('../../models')
  , jwt = require('jsonwebtoken')
  , UserSerializer = models.UserSerializerV2
  , config = require('../../../conf/envLocal')

exports.addRoutes = function(app) {
  if (!conf.remoteUser) {
    app.post('/v2/signup', function(req, res) {
      var newUser = new models.User( {
        username: req.body.username,
        password: req.body.password
      })

      models.User.findByUsername(newUser.username, function(err, user) {
        if (user !== null)
          return res.jsonp({ err: 'user ' + user.username + ' exists', status: 'fail'})

        newUser.create(function(err, user) {
          if (err) return res.jsonp({}, 422)

          req.logIn(user, function(err) {
            var secret = config.getAppConfig()['secret']
            var token = jwt.sign({ userId: user.id }, secret);

            new UserSerializer(user).toJSON(function(err, userJSON) {
              res.jsonp({ err: null, status: 'success', user: userJSON, token: token });
            })
          })
        })
      })
    })
  }
}
