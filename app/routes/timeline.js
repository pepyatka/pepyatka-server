var models = require('../models')
  , logger = require('../../logger').create()

exports.addRoutes = function(app) {
  app.post('/v1/timeline/:timelineId/subscribe', function(req, res) {
    req.user.subscribeTo(req.params.timelineId, function(err, r) {
      if (err) return res.jsonp({}, 422)

      res.jsonp({})
    })
  })

  app.post('/v1/timeline/:timelineId/unsubscribe', function(req, res) {
    req.user.unsubscribeTo(req.params.timelineId, function(err, r) {
      if (err) return res.jsonp({}, 422)

      res.jsonp({})
    })
  })

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
            timeline.toJSON({}, function(err, json) {
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
    models.User.findByUsername(req.user.username, function(err, user) {
      user.getRiverOfNews({
        start: req.query.start
      }, function(err, timeline) {
        if (timeline) {
          timeline.toJSON({}, function(err, json) {
            res.jsonp(json);
          })
        } else {
          res.jsonp({});
        }
      })
    })
  })
}
