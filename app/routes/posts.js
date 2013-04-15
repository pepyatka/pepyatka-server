var models = require('../models')
  , async = require('async')

exports.addRoutes = function(app) {
  var postSerializer = { 
    select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes'],
    createdBy: { select: ['id', 'username'] },
    comments: { select: ['id', 'body', 'createdBy'],
                createdBy: { select: ['id', 'username'] }},
    likes: { select: ['id', 'username']}
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
    if(!req.user)
      return res.jsonp({})

    if(req.body.timelinesIds && req.body.timelinesIds.length > 0) {
      var timelinesIds = Array.isArray(req.body.timelinesIds) ? req.body.timelinesIds : [req.body.timelinesIds]

      async.forEach(timelinesIds, function(timelineId, done) {
        req.user.newPost({
          body: req.body.body,
          files: req.files
        }, function(err, newPost) {
          newPost.timelineId = timelineId

          newPost.create(function(err, post) {
            done(err)
          })
        },
        function(err) {
          if (err) return res.jsonp({}, 422)

          res.jsonp({})
        })
      })
    } else {
      req.user.getPostsTimelineId(function(err, timelineId) {
        req.user.newPost({
          body: req.body.body,
          timelineId: timelineId,
          files: req.files
        }, function(err, newPost) {
          newPost.create(function(err, post) {
            if (err) return res.jsonp({}, 422)

            post.toJSON(postSerializer, function(err, json) { res.jsonp(json) })
          })
        })
      })
    }
  })
}
