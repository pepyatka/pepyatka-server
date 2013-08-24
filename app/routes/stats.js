var models = require('../models'),
  async = require('async')

var userSerializer = {
  select: ['id', 'username', 'info'],
  info: { select: ['screenName'] }
}

exports.addRoutes = function(app) {
  app.get('/v1/top/:category', function(req, res) {
    models.Stats.getTopUserIds(req.params.category, function(err, userIds) {
      if (!userIds)
        return res.jsonp(err, 422)

      // FIXME: refactor to map function
      var users = []
      async.forEach(userIds, function(userId, callback) {
        models.User.findById(userId, function(err, user) {
          if (!user)
            return callback(err)

          user.toJSON(userSerializer, function(err, json) {
            if (!json)
              return callback(err)

            users.push(json)
            callback(null)
          })
        })
      }, function(err) {
        if (err)
          return res.jsonp(err, 422)

        res.jsonp(users)
      })
    })
  })
}
