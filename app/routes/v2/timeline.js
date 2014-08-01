var models = require('../../models')
  , async = require('async')
  , TimelineSerializer = models.TimelineSerializerV2
  , SubscriberSerializer = models.SubscriberSerializerV2

exports.addRoutes = function(app) {
  app.get('/v2/timeline/:timelineId/subscribers', function(req, res) {
    models.Timeline.findById(req.params.timelineId, {}, function(err, timeline) {
      if (!timeline) return res.jsonp({}, 422)

      timeline.getSubscribers(function(err, subscribers) {
        async.map(subscribers, function(subscriber, callback) {

          new SubscriberSerializer(subscriber).toJSON(function(err, json) {
            callback(err, json);
          });
        }, function(err, json) {
          res.jsonp(json)
        })
      })
    })
  })

  app.post('/v2/timeline/:timelineId/subscribe', function(req, res) {
    req.user.subscribeTo(req.params.timelineId, function(err, r) {
      if (err) return res.jsonp({}, 422)

      res.jsonp({ err: err, status: 'success'})
    })
  })

  app.post('/v2/timeline/:timelineId/unsubscribe', function(req, res) {
    var unsubscribe = function() {
      req.user.unsubscribeTo(req.params.timelineId, function(err, r) {
        if (err) return res.jsonp({}, 422)

        res.jsonp({ err: err, status: 'success'})
      })
    }

    models.Timeline.findById(req.params.timelineId, { start: 0 }, function(err, timeline) {
      if (err)
        return res.jsonp({}, 422)

      models.FeedFactory.findById(timeline.userId, function(err, ownerFeed) {
        if (ownerFeed.type == 'group') {
          ownerFeed.removeAdministrator(req.user.id, function(err, result) {
            if (err)
              return res.jsonp({ err: err, status: 'fail'}, 422)

            unsubscribe()
          })
        } else {
          unsubscribe()
        }
      })
    })
  })

  app.get('/v2/timeline/everyone', function(req, res) {
    models.Timeline.getEveryoneTimeline({
      start: req.query.offset,
        num: req.query.limit
    }, function(err, timeline) {
      if (!timeline)
        return res.jsonp({});

      new TimelineSerializer(timeline).toJSON(function(err, json) {
        res.jsonp(json);
      });
    })
  }),

  app.get('/v2/timeline/:username', function(req, res) {
    // XXX: calling model's function affects overall performance, e.g.
    // in this case we need just one user paramers: id, however
    // findByUsername function will return entire structure. Not a top
    // priority right now, but must be fixed, for example, with
    // additional assoc array as a second parameter

    models.FeedFactory.findByName(req.params.username, function(err, user) {
      if (!user)
        return res.jsonp({}, 404)

      user.getPostsTimeline({
        start: req.query.offset,
        num: req.query.limit
      }, function(err, timeline) {
        if (!timeline)
          return res.jsonp({});

        new TimelineSerializer(timeline).toJSON(function(err, json) {
          res.jsonp(json);
        });
      })
    })
  }),

  app.get('/v2/timeline/:username/likes', function(req, res){
    models.User.findByUsername(req.params.username, function(err, user) {
      if (!user)
        return res.jsonp({}, 404)

      user.getLikesTimeline({
        start: req.query.offset,
        num: req.query.limit
      }, function(err, timeline) {
        if (!timeline)
          return res.jsonp({});

        new TimelineSerializer(timeline).toJSON(function(err, json) {
          res.jsonp(json);
        });
      })
    })
  }),

  app.get('/v2/timeline/:username/comments', function(req, res){
    models.User.findByUsername(req.params.username, function(err, user) {
      if (!user)
        return res.jsonp({}, 404)

      user.getCommentsTimeline({
        start: req.query.offset,
        num: req.query.limit
      }, function(err, timeline) {
        if (!timeline)
          return res.jsonp({});

        new TimelineSerializer(timeline).toJSON(function(err, json) {
          res.jsonp(json);
        });
      })
    })
  }),

  app.get('/v2/timeline', function(req, res) {
    if (!req.user)
      return res.jsonp({})

    var user = req.user

    user.getRiverOfNews({
      start: req.query.offset,
      num: req.query.limit
    }, function(err, timeline) {
      if (!timeline)
        return res.jsonp({});

      user.getPostsTimelineId(function(err, postsTimelineId) {
        if (err)
          return res.jsonp({})

        new TimelineSerializer(timeline).toJSON(function(err, json) {
          json.postsTimelineId = postsTimelineId;
          res.jsonp(json);
        })
      })
    })
  })
}
