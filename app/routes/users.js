var models = require('../models')
  , async = require('async')

exports.addRoutes = function(app) {
  var userSerializer = {
    select: ['id', 'username', 'admins', 'type']
  }

  var subscriptionSerializer = {
    select: ['id', 'user', 'name'],
    user: { select: ['id', 'username'] }
  }

  var subscriberSerializer = {
    select: ['id', 'username']
  }

  app.get('/v1/users', function(req, res) {
    if (!req.user) 
      return res.jsonp({})

    var userId = req.user.id

    if (!userId)
      return res.jsonp({}, 404)

    res.redirect('/v1/users/' + userId)
  })

  app.get('/v1/users/:username/subscribers', function(req, res) {
    models.FeedFactory.findByName(req.params.username, function(err, feed) {
      feed.getPostsTimeline({}, function(err, timeline) {
        timeline.getSubscribers(function(err, subscribers) {
          async.map(subscribers, function(subscriber, callback) {
            subscriber.toJSON(subscriberSerializer, function(err, json) {
              callback(err, json)
            })
          }, function(err, json) {
            var response = { subscribers: json }
            if (feed.type == 'group') {
              feed.getAdministratorsIds(function(err, administratorsIds) {
                response.admins = administratorsIds

                res.jsonp(response)
              })
            } else {
              res.jsonp(response)
            }
          })
        })
      })
    })
  })

  app.get('/v1/users/:username/subscriptions', function(req, res) {
    models.User.findByUsername(req.params.username, function(err, user) {
      if (err) return res.jsonp({}, 404)

      user.getSubscriptions(function(err, subscriptions) {
        async.map(subscriptions, function(subscription, callback) {
          subscription.toJSON(subscriptionSerializer, function(err, json) {
            callback(err, json)
          })
        }, function(err, json) {
          res.jsonp(json)
        })
      })
    })
  })

  app.get('/v1/users/:userId', function(req, res) {
    models.FeedFactory.findById(req.params.userId, function(err, feed) {
      if (err) return res.jsonp({}, 404)

      feed.toJSON(userSerializer, function(err, json) { res.jsonp(json) })
    })
  })

  app.delete('/v1/users/:username/subscribers/:userId', function(req, res) {
    models.FeedFactory.findByName(req.params.username, function(err, feedOwner) {
      if (err)
        return res.jsonp({}, 422)

      var unsubscribe = function() {
        async.parallel([
          function(done) {
            models.FeedFactory.findById(req.params.userId, function(err, subscribedFeed) {
              if(err)
                return done(err)

              feedOwner.getPostsTimelineId(function(err, timelineId) {
                if(err)
                  return done(err)

                subscribedFeed.unsubscribeTo(timelineId, function(err) {
                  if(err)
                    return done(err)

                  done(null)
                })
              })
            })
          },
          function(done) {
            if (feedOwner.type != 'group')
              return done(null)

            feedOwner.removeAdministrator(req.params.userId, function(err, res) {
              done(err)
            })
          }],
          function(err) {
            if (err)
              return res.jsonp({}, 422)

            res.jsonp({err: err, status: 'success'})
          })
      }

      if (feedOwner.type == 'group') {
        feedOwner.getAdministratorsIds(function(err, administratorsIds) {
          if (administratorsIds.length == 1)
            return res.jsonp({err: err, status: 'fail'})

          unsubscribe()
        })
      } else {
        unsubscribe()
      }
    })
  })
}
