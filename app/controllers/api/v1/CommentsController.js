"use strict";

var models = require('../../../models')
  , CommentSerializer = models.CommentSerializer

exports.addController = function(app) {
  var CommentsController = function() {
  }

  CommentsController.create = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    req.user.newComment({
      body: req.body.comment.body,
      postId: req.body.comment.post
    })
      .then(function(newComment) { return newComment.create() })
      .then(function(newComment) {
        new CommentSerializer(newComment).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(401).send({}) })
  }

  return CommentsController
}
