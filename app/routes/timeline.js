var models = require('../models');

exports.add_routes = function(app, connections) {
  app.get('/v1/timeline/:username', function(req, res){
    models.User.find_by_username(req.params.username, function(user) {
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
