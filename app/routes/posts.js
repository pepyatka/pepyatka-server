var models = require('../models')

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
      if (post) {
        post.toJSON(postSerializer, function(err, json) {
          res.jsonp(json);
        })
      } else {
        res.jsonp({'error': 'Not found'}, 404);
      }
    })
  })

  app.post('/v1/posts/:postId/like', function(req, res) {
    if(!req.user) {
      return res.jsonp({})
    }

    models.Post.addLike(req.params.postId, req.user.id, function(err, r) {
      // post.toJSON({}, function(err, json) { res.jsonp(json) })

      models.Stats.findByUserId(req.user.id, function(err, stats) {
        stats.addLike(function(err, stats) {
          res.jsonp({})
        })
      })
    })
  })

  app.post('/v1/posts/:postId/unlike', function(req, res) {
    if(!req.user) {
      return res.jsonp({})
    }

    models.Post.removeLike(req.params.postId, req.user.id, function(err, r) {
      models.Stats.findByUserId(req.user.id, function(err, stats) {
        stats.removeLike(function(err, stats) {
          res.jsonp({})
        })
      })
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
          models.Stats.findByUserId(req.user.id, function(err, stats) {
            stats.comments = stats.comments - ids.length
            stats.update(function(err, stats) {
              res.jsonp({})
            })
          })
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

    req.user.getPostsTimelineId(function(err, timelineId) {
      req.user.newPost({
        body: req.body.body,
        timelineId: timelineId,
        files: req.files
      }, function(err, newPost) {
        newPost.create(function(err, post) {
          if (err) return res.jsonp({}, 422)

          models.Stats.findByUserId(req.user.id, function(err, stats) {
            stats.addPost(function(err, stats) {
              post.toJSON(postSerializer, function(err, json) { res.jsonp(json) })
            })
          })
        })
      })
    })
  })
}
