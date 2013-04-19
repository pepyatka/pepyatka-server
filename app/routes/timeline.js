var models = require('../models')
  , async = require('async')

exports.addRoutes = function(app) {
  var timelineSerializer = { 
    select: ['id', 'posts', 'user', 'subscribers'],
    posts: {
      select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes', 'groups'],
      createdBy: { select: ['id', 'username'] },
      comments: { select: ['id', 'body', 'createdBy'],
                  createdBy: { select: ['id', 'username'] }
                },
      likes: { select: ['id', 'username'] },
      groups: { select: ['id', 'username'] }
    },
    user: {
      select: ['id', 'username', 'subscribers', 'subscriptions', 'statistics', 'type', 'admins'],
      subscriptions: { select: ['id', 'user', 'name'],
                       user: { select: ['id', 'username'] }
      },
      subscribers: { select: ['id', 'username'] }
    },
    subscribers: { select: ['id', 'username'] }
  }

  var subscriberSerializer = {
    select: ['id', 'username']
  }

  app.get('/v1/timeline/:timelineId/subscribers', function(req, res) {
    models.Timeline.findById(req.params.timelineId, {}, function(err, timeline) {
      timeline.getSubscribers(function(err, subscribers) {
        async.map(subscribers, function(subscriber, callback) {
          subscriber.toJSON(subscriberSerializer, function(err, json) {
            callback(err, json)
          })
        }, function(err, json) {
          res.jsonp(json)
        })
      })
    })
  })

  app.post('/v1/timeline/:timelineId/subscribe', function(req, res) {
    req.user.subscribeTo(req.params.timelineId, function(err, r) {
      if (err) return res.jsonp({}, 422)

      res.jsonp({})
    })
  })

  app.post('/v1/timeline/:timelineId/unsubscribe', function(req, res) {
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
              return res.jsonp({ err: err, status: 'fail'})

            unsubscribe()
          })
        } else {
          unsubscribe()
        }
      })
    })
  })

  app.get('/v1/timeline/everyone', function(req, res) {
    models.Timeline.getEveryoneTimeline({
      start: req.query.start
    }, function(err, timeline) {
      if (!timeline)
        return res.jsonp({});

      timeline.toJSON(timelineSerializer, function(err, json) {
        res.jsonp(json);
      })
    })
  }),

  app.get('/v1/timeline/:username', function(req, res){
    // XXX: calling model's function affects overall performance, e.g.
    // in this case we need just one user paramers: id, however
    // findByUsername function will return entire structure. Not a top
    // priority right now, but must be fixed, for example, with
    // additional assoc array as a second parameter

    models.FeedFactory.findByName(req.params.username, function(err, user) {
      if (!user)
        return res.jsonp({}, 404)

      user.getPostsTimeline({
        start: req.query.start
      }, function(err, timeline) {
        if (!timeline)
          return res.jsonp({});

        timeline.toJSON(timelineSerializer, function(err, json) {
          res.jsonp(json);
        })
      })
    })
  }),

  app.get('/v1/timeline/:username/likes', function(req, res){
    models.User.findByUsername(req.params.username, function(err, user) {
      if (!user)
        return res.jsonp({}, 404)

      user.getLikesTimeline({
        start: req.query.start
      }, function(err, timeline) {
        if (!timeline)
          return res.jsonp({});

        timeline.toJSON(timelineSerializer, function(err, json) {
          res.jsonp(json);
        })
      })
    })
  }),

  app.get('/v1/timeline/:username/comments', function(req, res){
    models.User.findByUsername(req.params.username, function(err, user) {
      if (!user)
        return res.jsonp({}, 404)

      user.getCommentsTimeline({
        start: req.query.start
      }, function(err, timeline) {
        if (!timeline)
          return res.jsonp({});

        timeline.toJSON(timelineSerializer, function(err, json) {
          res.jsonp(json);
        })
      })
    })
  }),

  app.get('/v1/timeline', function(req, res) {
    if (!req.user)
      return res.jsonp({})

    models.User.findByUsername(req.user.username, function(err, user) {
      user.getRiverOfNews({
        start: req.query.start
      }, function(err, timeline) {
        if (!timeline)
          return res.jsonp({});

        timeline.toJSON(timelineSerializer, function(err, json) {
          res.jsonp(json);
        })
      })
    })
  })
}
