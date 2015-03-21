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

  CommentsController.update = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    models.Comment.findById(req.params.commentId)
      .then(function(comment) {
        return comment.update({
          body: req.body.comment.body
        })
      })
      .then(function(comment) {
        new CommentSerializer(comment).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(401).send({}) })
  }

  CommentsController.destroy = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    models.Comment.findById(req.params.commentId)
      .then(function(comment) { return comment.destroy() })
      .then(function(status) { res.jsonp({}) })
      .catch(function(e) { res.status(422).send({}) })
  }

  return CommentsController
}
