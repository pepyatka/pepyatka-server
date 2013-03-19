var models = require('../models')

exports.addRoutes = function(app) {
  app.get('/top/:category', function(req, res) {
    models.Stats.getTopUserIds(req.params.category, function(err, userIds) {
      console.log(iserIds)
    })
  })
}
