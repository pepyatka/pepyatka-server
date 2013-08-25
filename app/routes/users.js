var models = require('../models')
  , async = require('async')

exports.addRoutes = function(app) {
  var requireAuthorization = function(requestingUser, feed, callback) {
    switch(feed.type) {
      case 'group' :
        feed.getAdministratorsIds(function(err, administratorsIds) {
          callback(err, administratorsIds.indexOf(requestingUser.id) != -1)
        })
        break

      default :
        callback(null, requestingUser.id == feed.id)
    }
  }

  var feedInfoSerializer = {
    select: ['id', 'username', 'type', 'subscriptions', 'subscribers', 'admins'],
    subscriptions: {
      select: ['id', 'user'],
      user: { select: ['id', 'username', 'type', 'admins', 'info'],
              info: { select: ['screenName'] } }
    },
    subscribers: {
      select: ['id', 'username', 'type', 'admins', 'info'],
      info: { select: ['screenName'] }
    }
  }

  var userSerializer = {
    select: ['id', 'username', 'admins', 'type', 'info', "rss"],
    info: { select: ['screenName'] }
  }

  var subscriptionSerializer = {
    select: ['id', 'user', 'name'],
    user: { select: ['id', 'username', 'type', 'info'],
            info: { select: ['screenName'] } },
  }

  var subscriberSerializer = {
    select: ['id', 'username', 'info'],
    info: { select: ['screenName'] }
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
      if (!feed)
        return res.jsonp({}, 404)

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
          models.FeedFactory.findById(req.params.userId, function(err, subscribedFeed) {
          if(err)
            return res.jsonp({}, 422)

          feedOwner.getPostsTimelineId(function(err, timelineId) {
            subscribedFeed.unsubscribeTo(timelineId, function(err) {

              res.jsonp({err: err, status: 'success'})
            })
          })
        })
      }

      requireAuthorization(req.user, feedOwner, function(err, isAuthorized) {
        if(!isAuthorized)
          return res.jsonp({err: err, status: 'fail'}, 422)

        if (feedOwner.type == 'group') {
          feedOwner.getAdministratorsIds(function(err, administratorsIds) {
            if (administratorsIds.indexOf(req.params.userId) != -1)
              return res.jsonp({err: err, status: 'fail'}, 422)

            unsubscribe()
          })
        } else {
          unsubscribe()
        }
      })
    })
  })

  app.get('/v1/users/:username/feedinfo', function(req, res) {
    models.FeedFactory.findByName(req.params.username, function(err, feed) {
      if (err) return res.jsonp({}, 404)

      feed.toJSON(feedInfoSerializer, function(err, json) {
        res.jsonp(json)
      })
    })
  })

  app.patch('/v1/users', function(req, res) {
    if (!req.user)
      return res.jsonp({}, 422)

    models.FeedFactory.findById(req.user.id, function(err, user) {
      var params = req.param('params')
      var attrs = { screenName: params.screenName,
                    receiveEmails: params.receiveEmails,
                    email: params.email,
                    rss: params.rss
                  }
      user.update(attrs, function(err, user) {
        if (err)
          return res.jsonp({}, 422)

        user.toJSON(userSerializer, function(err, json) { res.jsonp(json) })
      })
    })
  })

  app.get('/v1/whoami', function(req, res) {
    if (!req.user)
      return res.jsonp({}, 422)

    req.user.toJSON(userSerializer, function(err, json) {
      res.jsonp(json)
    })
  })
}
