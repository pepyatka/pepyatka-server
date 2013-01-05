var models = require('../models');

exports.addRoutes = function(app, connections) {
  app.get('/v1/timeline/:username', function(req, res){
    models.User.findByUsername(req.params.username, function(user) {
      models.Timeline.find(user.id, function(timeline) {
        timeline.toJSON(function(json) {
          res.jsonp(json);
        })
      })

      // models.Timeline.posts(user.id, function(timeline) {
      //   res.jsonp(timeline)
      // })
    })
  });
}
