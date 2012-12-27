var models = require('../models');

exports.add_routes = function(app) {
  app.get('/v1/timeline/:username', function(req, res){
    models.User.find_by_username(req.params.username, function(user) {
      models.Timeline.posts(user.id, function(timeline) {
        res.send(JSON.stringify(timeline, null, 2));
      })
    })
  });
}
