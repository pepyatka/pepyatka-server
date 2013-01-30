var models = require('../models')
  , async = require('async')
  , redis = require('redis')

exports.addRoutes = function(app, connections) {
  app.post('/v1/comments', function(req, res){
    // TODO: filter body params - known as strong params
    var newComment = req.user.newComment({
      body: req.body.body,
      postId: req.body.postId
    })

    newComment.save(function(err, comment) {
      if (err) return res.jsonp({}, 422)

      comment.toJSON(function(err, json) { res.jsonp(json) })
    })
  });
}
