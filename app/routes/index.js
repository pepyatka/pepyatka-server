var models = require('../models');

exports.add_routes = function(app) {
  app.get('/', function(req, res) {
    // TODO: -> current_user.Timeline.posts
    models.Timeline.posts(req.session.user_id, function(posts) {
      res.render('./home', { posts: posts })
    })
  });
}
