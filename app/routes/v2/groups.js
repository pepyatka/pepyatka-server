var models = require('../../models')
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

  app.delete('/v2/users/:userId', function(req, res) {
    models.FeedFactory.findById(req.params.userId, function(err, mainFeed) {
      if(err)
        return res.jsonp({}, 422)

      requireAuthorization(req.user, mainFeed, function(err, isAuthorized) {
        if (!isAuthorized)
          return res.jsonp({ err: err, status: 'fail'}, 422)

        models.FeedFactory.destroy(req.params.userId, function(err) {
          if(err)
            res.jsonp({ err: err, status: 'fail'}, 422)

          res.jsonp({ err: err, status: 'success'})
        })
      })
    })
  })

  // TODO: this shouldn't be POST /v2/users route
  app.post('/v2/users', function(req, res) {
    if (!req.user)
      return res.jsonp({}, 422)

    var newGroup = new models.Group({
      username: req.body.username
    })

    newGroup.create(req.user.id, function(err, group) {
      if (err) return res.jsonp({ err: err, status: 'fail'}, 422)

      res.jsonp({ err: null, status: 'success'})
    })
  })

  // NOTE: delete function is disabled mostly for huh security reasons
  // app.patch('/v2/users/:userId', function(req, res) {
  //   models.Group.findById(req.params.userId, function(err, group) {
  //     if (err)
  //       return res.jsonp({ err: err, status: 'fail'}, 422)

  //     group.username = req.body.username
  //     group.update(function(err, group) {
  //       if (err)
  //         return res.jsonp({ err: err, status: 'fail'}, 422)

  //       res.jsonp({ err: null, status: 'success'})
  //     })
  //   })
  // })

  app.post('/v2/users/:username/subscribers/:userId/admin', function(req, res) {
    models.FeedFactory.findByName(req.params.username, function(err, mainFeed) {
      requireAuthorization(req.user, mainFeed, function(err, isAuthorized) {
        if (!isAuthorized)
          return res.jsonp({ err: err, status: 'fail'}, 422)

        mainFeed.addAdministrator(req.params.userId, function(err, result) {
          if (err) return res.jsonp({ err: err, status: 'fail'}, 422)

          res.jsonp({ err: null, status: 'success'})
        })
      })
    })
  })

  app.post('/v2/users/:username/subscribers/:userId/unadmin', function(req, res) {
    models.FeedFactory.findByName(req.params.username, function(err, mainFeed) {
      requireAuthorization(req.user, mainFeed, function(err, isAuthorized) {
        if (!isAuthorized)
          return res.jsonp({ err: err, status: 'fail'}, 422)

        mainFeed.removeAdministrator(req.params.userId, function(err, result) {
          if (err) return res.jsonp({ err: err, status: 'fail'}, 422)

          res.jsonp({ err: null, status: 'success'})
        })
      })
    })
  })
}
