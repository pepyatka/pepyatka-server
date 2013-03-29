var models = require('../models')
  , async = require('async')

exports.addRoutes = function(app) {
  var userSerializer = {
    select: ['id', 'username']
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

    if (userId)
      res.redirect('/v1/users/' + userId)
    else
      res.jsonp({}, 404)
  })

  app.get('/v1/users/:username/subscribers', function(req, res) {
    models.User.findByUsername(req.params.username, function(err, user) {
      if (err) return res.jsonp({}, 422)
      
      user.getPostsTimeline({}, function(err, timeline) {
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
  })

  app.get('/v1/users/:username/subscriptions', function(req, res) {
    models.User.findByUsername(req.params.username, function(err, user) {
      if (err) return res.jsonp({}, 422)

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
    models.User.findById(req.params.userId, function(err, user) {
      if (err) return res.jsonp({}, 422)

      user.toJSON(userSerializer, function(err, json) { res.jsonp(json) })
    })
  })
}
