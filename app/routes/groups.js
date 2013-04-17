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

  app.delete('/v1/users/:userId', function(req, res) {
    models.FeedFactory.destroy(req.params.userId, function(err) {
      if(err)
        return res.jsonp({}, 422)

      res.jsonp({})
    })
  })

  app.post('/v1/users', function(req, res) {
    models.User.findByUsername(req.body.ownerName, function(err, user) {
      var newGroup = new models.Group({
        username: req.body.username
      })

      newGroup.create(user.id, function(err, group) {
        if (err) return res.jsonp({ err: err, status: 'fail'})

        res.jsonp({ err: null, status: 'success'})
      })
    })
  })

//  app.patch('/v1/users/:userId', function(req, res) {
//    models.Group.findById(req.params.userId, function(err, group) {
//      if (err)
//        return res.jsonp({ err: err, status: 'fail'})
//
//      group.username = req.body.username
//      group.update(function(err, group) {
//        if (err)
//          return res.jsonp({ err: err, status: 'fail'})
//
//        res.jsonp({ err: null, status: 'success'})
//      })
//    })
//  })

  app.post('/v1/users/:username/subscribers/:userId/admin', function(req, res) {
    models.FeedFactory.findByName(req.params.username, function(err, mainFeed) {
      requireAuthorization(req.user, mainFeed, function(err, isAuthorized) {
        if (!isAuthorized)
          return res.jsonp({ err: err, status: 'fail'})

        mainFeed.addAdministrator(req.params.userId, function(err, result) {
          if (err) return res.jsonp({ err: err, status: 'fail'})

          res.jsonp({ err: null, status: 'success'})
        })
      })
    })
  })

  app.post('/v1/users/:username/subscribers/:userId/unadmin', function(req, res) {
    models.FeedFactory.findByName(req.params.username, function(err, mainFeed) {
      requireAuthorization(req.user, mainFeed, function(err, isAuthorized) {
        if (!isAuthorized)
          return res.jsonp({ err: err, status: 'fail'})

        mainFeed.removeAdministrator(req.params.userId, function(err, result) {
          if (err) return res.jsonp({ err: err, status: 'fail'})

          res.jsonp({ err: null, status: 'success'})
        })
      })
    })
  })
}
