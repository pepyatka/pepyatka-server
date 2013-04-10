var models = require('../models')
  , async = require('async')

exports.addRoutes = function(app) {
  app.delete('/v1/users/:username/subscriptions/:userId', function(req, res) {
    models.User.findByUsername(req.params.username, function(err, userOwner) {
      if (err)
        return res.jsonp({}, 422)

      models.User.findById(req.params.userId, function(err, subscribedUser) {
        if(err)
          return res.jsonp({}, 422)

        userOwner.getPostsTimelineId(function(err, timelineId) {
          if(err)
            return res.jsonp({}, 422)

          subscribedUser.unsubscribeTo(timelineId, function(err) {
            if(err)
              return res.jsonp({}, 422)

            res.jsonp({})
          })
        })
      })
    })
  })

  app.delete('/v1/users/:userId', function(req, res) {
    models.Group.destroy(req.params.userId, function(err) {
      if(err)
        return res.jsonp({}, 422)

      res.jsonp({})
    })
  })

  app.post('/v1/users', function(req, res) {
    models.User.findByUsername(req.body.username, function(err, user) {
      if (user !== null)
        return res.jsonp({ err: 'user ' + user.username + ' exists', status: 'fail'})

      var newGroup = new models.Group({
        username: req.body.username
      })

      newGroup.create(function(err, group) {
        if (err) return res.jsonp({ err: err, status: 'fail'})

        res.jsonp({ err: null, status: 'success'})
      })
    })
  })

  app.patch('/v1/users/:userId', function(req, res) {
    models.User.findByUsername(req.body.username, function(err, user) {
      if (user !== null)
        return res.jsonp({ err: 'user ' + user.username + ' exists', status: 'fail'})

      models.Group.findById(req.params.userId, function(err, group) {
        if (err)
          return res.jsonp({ err: err, status: 'fail'})

        group.username = req.body.username
        group.update(function(err, group) {
          if (err)
            return res.jsonp({ err: err, status: 'fail'})

          res.jsonp({ err: null, status: 'success'})
        })
      })
    })
  })

  //temp rout for testing
  app.get('/v1/groups/create/:name', function(req, res) {
    var newGroup = new models.Group({
      username: req.params.name
    })

    newGroup.create(function(err, group) {
      if (err) return res.jsonp({}, 422)

      res.jsonp({})
    })
  })
}
