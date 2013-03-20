var models = require('../models'),
  async = require('async')

var userSerializer = {
  select: ['id', 'username']
}

exports.addRoutes = function(app) {
  app.get('/v1/top/:category', function(req, res) {
    models.Stats.getTopUserIds(req.params.category, function(err, userIds) {
      if (userIds) {
        var users = []
        async.forEach(userIds, function(userId, callback) {
            models.User.findById(userId, function(err, user) {
              if (user) {
                user.toJSON(userSerializer, function(err, json) {
                  if (json) {
                    users.push(json)
                    callback(null)
                  } else {
                    callback(err)
                  }
                })
              } else {
                callback(err)
              }
            })
          },
          function(err) {
            if (err) {
              res.jsonp(err)
            } else {
              res.jsonp(users)
            }
          })
      } else {
        res.jsonp(err)
      }
    })
  })
}
