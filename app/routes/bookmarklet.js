exports.addRoutes = function(app) {
  app.get('/bookmarklet', function(req, res) {
    res.render('./bookmarklet', {csrf_token: req.session._csrf})
  })

  app.post('/bookmarklet', function(req, res) {
    if (!req.user) return res.jsonp({});

    req.user.newPost({
      body: req.body.title
    }, function(err, newPost) {
      newPost.create(function(err, post) {
        if (err) return res.jsonp({}, 422);

        var newComment = req.user.newComment({
          body: req.body.comment,
          postId: post.id
        })

        newComment.create(function(err, comment) {
          if (err) return res.jsonp({}, 422)

          res.render('./bookmarklet/done')
        })
      })
    })
  })
}
