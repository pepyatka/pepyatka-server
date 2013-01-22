var models = require('../models')
  , logger = require('../../logger').create()

exports.addRoutes = function(app) {
  app.get('/v1/timeline/:username', function(req, res){
    // XXX: calling model's function affects overall performance, e.g.
    // in this case we need just one user paramers: id, however
    // findByUsername function will return entire structure. Not a top
    // priority right now, but must be fixed, for example, with
    // additional assoc array as a second parameter

    models.User.findByUsername(req.params.username, function(err, user) {
      if (user) {
        user.getPostsTimeline({
          start: req.query.start
        }, function(err, timeline) {
          if (timeline) {
            timeline.toJSON(function(err, json) {
              res.jsonp(json);
            })
          } else {
            res.jsonp({});
          }
        })
      } else {
        res.jsonp({})
      }
    })
  }),

  app.get('/v1/timeline', function(req, res) {
    console.log()
    models.User.findByUsername(req.user.username, function(err, user) {
      user.getRiverOfNews({
        start: req.query.start
      }, function(err, timeline) {
        if (timeline) {
          timeline.toJSON(function(err, json) {
            res.jsonp(json);
          })
        } else {
          res.jsonp({});
        }
      })
    })
  })
}
