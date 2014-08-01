var models = require('../../models')
  , async = require('async')
  , UserSerializer = models.UserSerializerV2;

exports.addRoutes = function(app) {
  app.get('/v2/top/:category', function(req, res) {
    models.Stats.getTopUserIdsWithScores(req.params.category, function(err, userIdsWithScores) {
      if (err || !userIdsWithScores)
        return res.jsonp(err, 422)

      var userIdsScores = {}
      var userIds = []
      for(var i=0; i<userIdsWithScores.length; i+=2) {
        userIdsScores[userIdsWithScores[i]] = userIdsWithScores[i+1]
        userIds.push(userIdsWithScores[i])
      }

      // FIXME: refactor to map function
      var users = []
      async.forEach(userIds, function(userId, callback) {
        models.User.findById(userId, function(err, user) {
          // NOTE: this user does not exist anymore, e.g. was deleted or
          // database is broken
          if (!user)
            return callback(null)

          new UserSerializer(user).toJSON(function(err, json) {
            if (!json)
              return callback(err);

            json.score = userIdsScores[userId];
            users.push(json);
            callback(null);
          });
        })
      }, function(err) {
        if (err)
          return res.jsonp(err, 422)

        res.jsonp(users)
      })
    })
  })
}
