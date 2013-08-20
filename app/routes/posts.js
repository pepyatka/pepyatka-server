var models = require('../models')
  , async = require('async')

exports.addRoutes = function(app) {
  var requireAuthorization = function(requestingUser, timelineId, callback) {
    models.Timeline.findById(timelineId, { start : 0 }, function(err, timeline) {
      if (err)
        return callback(err, null)

      if (timeline.userId == requestingUser.id)
        return callback(null, true)

      timeline.getSubscribersIds(function(err, userIds) {
        if (err)
          return callback(err, null)

        callback(err, userIds.indexOf(requestingUser.id) != -1)
      })
    })
  }

  var postSerializer = {
    select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'updatedAt', 'likes', 'groups'],
    createdBy: { select: ['id', 'username'] },
    comments: { select: ['id', 'body', 'createdBy'],
                createdBy: { select: ['id', 'username', 'info'],
                             info: {select: ['screenName'] }}},
    likes: { select: ['id', 'username', 'info'],
             info: {select: ['screenName'] }},
    groups: { select: ['id', 'username', 'info'],
              info: {select: ['screenName'] }}
  }

  app.get('/v1/posts/:postId', function(req, res) {
    models.Post.findById(req.params.postId, function(err, post) {
      if (!post)
        return res.jsonp({'error': 'Not found'}, 404);

      post.toJSON(postSerializer, function(err, json) {
        res.jsonp(json);
      })
    })
  })

  app.post('/v1/posts/:postId/like', function(req, res) {
    if (!req.user)
      return res.jsonp({})

    models.Post.addLike(req.params.postId, req.user.id, function(err, r) {
      // post.toJSON({}, function(err, json) { res.jsonp(json) })
      if (err) return res.jsonp({}, 422)

      res.jsonp({})
    })
  })

  app.post('/v1/posts/:postId/unlike', function(req, res) {
    if (!req.user)
      return res.jsonp({})

    models.Post.removeLike(req.params.postId, req.user.id, function(err, r) {
      if (err) return res.jsonp({}, 422)

      res.jsonp({})
    })
  })

  app.delete('/v1/posts/:postId', function(req, res) {
    if (!req.user || req.user.username == 'anonymous')
      return res.jsonp({})

    models.Post.findById(req.params.postId, function(err, post) {
      if (!post || req.user.id != post.userId)
        return res.jsonp({})

      post.getCommentsIds(function(err, ids) {
        models.Post.destroy(req.params.postId, function(err, r) {
          res.jsonp({})
        })
      })
    })
  })

  app.patch('/v1/posts/:postId', function(req, res) {
    if (!req.user || req.user.username == 'anonymous')
      return res.jsonp({})

    models.Post.findById(req.params.postId, function(err, post) {
      if (!post || req.user.id != post.userId)
        return res.jsonp({})

      var params = { body: req.body.body }
      post.update(params, function(err, post) {
        if (err) return res.jsonp({}, 422)

        res.jsonp({})
      })
    })
  })

  app.post('/v1/posts', function(req, res) {
    var timelineIds = [];
    var notAuthorized = false;

    if (!req.user) return res.jsonp({});

    if (Array.isArray(req.body.timelinesIds)) {
      timelineIds = req.body.timelinesIds;
    } else if (req.body.timelinesIds) {
      timelineIds = [req.body.timelinesIds];
    }

    async.forEach(timelineIds, function(timelineId, done) {
      requireAuthorization(req.user, timelineId, function(err, valid) {
        if (err || !valid) notAuthorized = true;
        done(false);
      });
    }, function(err) {
      if (notAuthorized) return res.jsonp({}, 403);

      req.user.newPost({
        body: req.body.body,
        timelineIds: timelineIds,
        files: req.files
      }, function(err, newPost) {
        newPost.create(function(err, post) {
          if (err) return res.jsonp({}, 422);
          post.toJSON(postSerializer, function(err, json) {
            res.jsonp(json);
          });
        });
      });
    });
  });
};
