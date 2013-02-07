var models = require('../models')

exports.addRoutes = function(app) {
  app.get('/v1/posts/:postId', function(req, res) {
    models.Post.findById(req.params.postId, function(err, post) {
      if (post) {
        post.toJSON({ select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes'],
                      createdBy: { select: ['id', 'username'] },
                      comments: { select: ['id', 'body', 'createdBy'],
                                  createdBy: { select: ['id', 'username'] }},
                      likes: { select: ['id', 'username']}
                    }, function(err, json) {
          res.jsonp(json);
        })
      } else {
        res.jsonp({'error': 'Not found'}, 404);
      }
    })
  })

  app.post('/v1/posts/:postId/like', function(req, res) {
    models.Post.addLike(req.params.postId, req.user.id, function(err, r) {
      // post.toJSON({}, function(err, json) { res.jsonp(json) })

      res.jsonp({})
    })
  })

  app.post('/v1/posts/:postId/unlike', function(req, res) {
    models.Post.removeLike(req.params.postId, req.user.id, function(err, r) {
      res.jsonp({})
    })
  })

  app.post('/v1/posts', function(req, res) {
    req.user.getPostsTimelineId(function(err, timelineId) {
      req.user.newPost({
        body: req.body.body,
        timelineId: timelineId,
        files: req.files
      }, function(err, newPost) {
        newPost.save(function(err, post) {
          if (err) return res.jsonp({}, 422)

          post.toJSON({ select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes'],
                        createdBy: { select: ['id', 'username'] },
                        comments: { select: ['id', 'body', 'createdBy'],
                                    createdBy: { select: ['id', 'username'] }},
                        likes: { select: ['id', 'username']}
                      }, function(err, json) { res.jsonp(json) })
        })
      })
    })
  })
}
