var models = require('../models');

exports.addRoutes = function(app, connections) {
  app.get('/v1/timeline/:username', function(req, res){
    // XXX: calling model's function affect overall performance, e.g.
    // in this case we need just one user paramers: id, however
    // findByUsername function will return entire structure. Not a top
    // priority right now, but must be fixed, for example, with
    // additional assoc array as a second parameter
    models.User.findByUsername(req.params.username, function(user) {
      models.Timeline.find(user.id, function(timeline) {
        timeline.toJSON(function(json) {
          res.jsonp(json);
        })
      })
    })
  });
}
