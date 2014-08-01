var models = require('../../models')
  , async = require('async')

var UserSerializer = models.UserSerializerV1;
var FeedInfoSerializer = models.FeedInfoSerializerV1;
var SubscriptionSerializer = models.SubscriptionSerializerV1;
var SubscriberSerializer = models.SubscriberSerializerV1;

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

  app.get('/v2/users', function(req, res) {
    if (!req.user)
      return res.jsonp({})

    var userId = req.user.id

    if (!userId)
      return res.jsonp({}, 404)

    res.redirect('/v2/users/' + userId)
  })

  app.get('/v2/users/:username/subscribers', function(req, res) {
    models.FeedFactory.findByName(req.params.username, function(err, feed) {
      if (!feed)
        return res.jsonp({}, 404)

      feed.getPostsTimeline({}, function(err, timeline) {
        timeline.getSubscribers(function(err, subscribers) {
          async.map(subscribers, function(subscriber, callback) {
            new SubscriberSerializer(subscriber).toJSON(function(err, json) {
              callback(err, json);
            });
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

  app.get('/v2/users/:username/subscriptions', function(req, res) {
    models.User.findByUsername(req.params.username, function(err, user) {
      if (err) return res.jsonp({}, 404)

      user.getSubscriptions(function(err, subscriptions) {
        async.map(subscriptions, function(subscription, callback) {
          new SubscriptionSerializer(subscription).toJSON(function(err, json) {
            callback(err, json);
          });
        }, function(err, json) {
          res.jsonp(json)
        })
      })
    })
  })

  app.get('/v2/users/:userId', function(req, res) {
    models.FeedFactory.findById(req.params.userId, function(err, feed) {
      if (err) return res.jsonp({}, 404)

      new UserSerializer(feed).toJSON(function(err, json) {
        res.jsonp(json);
      });
    })
  })

  app.delete('/v2/users/:username/subscribers/:userId', function(req, res) {
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

  app.get('/v2/users/:username/feedinfo', function(req, res) {
    models.FeedFactory.findByName(req.params.username, function(err, feed) {
      if (err) return res.jsonp({}, 404)

      new FeedInfoSerializer(feed).toJSON(function(err, json) {
        res.jsonp(json);
      });
    })
  })

  app.patch('/v2/users', function(req, res) {
    if (!req.user)
      return res.jsonp({}, 422)

    var params = req.param('params');

    models.FeedFactory.findById(params.userId, function(err, user) {
      requireAuthorization(req.user, user, function(error, authorized) {
        if (!error && authorized) {
          var attrs = {
            screenName: params.screenName,
            receiveEmails: params.receiveEmails,
            email: params.email,
            rss: params.rss
          };
          user.update(attrs, function(err, user) {
            if (err) return res.json(err, 422);

            new UserSerializer(user).toJSON(function(err, json) {
              res.jsonp(json);
            });
          });

        } else {
          // TODO: Add 403 case.
          return res.jsonp({}, 422);
        }
      });
    });
  });

  app.get('/v2/whoami', function(req, res) {
    if (!req.user)
      return res.jsonp({}, 422)

    new UserSerializer(req.user).toJSON(function(err, json) {
      if (err) return res.json(err, 422);

      res.jsonp(json);
    });
  })
}
