var models = require('../models')
  , async = require('async')
  , redis = require('redis')

exports.addRoutes = function(app, connections) {
  app.delete('/v1/comments/:commentId', function(req, res) {
    if (!req.user)
      return res.jsonp({})

    models.Comment.findById(req.params.commentId, function(err, comment) {
      if (!comment || req.user.id != comment.userId)
        return res.jsonp({})

      models.Comment.destroy(req.params.commentId, function(err, r) {
        res.jsonp({})
      })
    })
  })


  app.post('/v1/comments', function(req, res){
    if(!req.user) {
      return res.jsonp({})
    }

    // TODO: filter body params - known as strong params
    var newComment = req.user.newComment({
      body: req.body.body,
      postId: req.body.postId
    })

    newComment.save(function(err, comment) {
      if (err) return res.jsonp({}, 422)

      comment.toJSON({ select: ['id', 'body', 'createdAt', 'updatedAt', 'createdBy', 'postId'],
                       createdBy: { select: ['id', 'username'] }
                     }, function(err, json) { res.jsonp(json) })
    })
  });
}
