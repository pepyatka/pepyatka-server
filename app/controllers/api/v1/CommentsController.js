"use strict";

var models = require('../../../models')
  , CommentSerializer = models.CommentSerializer
  , exceptions = require('../../../support/exceptions')
  , ForbiddenException = exceptions.ForbiddenException

exports.addController = function(app) {
  /**
   * @constructor
   */
  var CommentsController = function() {
  }

  CommentsController.create = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    req.user.newComment({
      body: req.body.comment.body,
      postId: req.body.comment.postId
    })
      .then(function(newComment) { return newComment.create() })
      .then(function(newComment) {
        new CommentSerializer(newComment).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(422).send({}) })
  }

  CommentsController.update = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    models.Comment.getById(req.params.commentId)
      .then(function(comment) {
        if (comment.userId != req.user.id) {
          return Promise.reject(new ForbiddenException(
              "You can't update another user's comment"
          ))
        }
        return comment.update({
          body: req.body.comment.body
        })
      })
      .then(function(comment) {
        new CommentSerializer(comment).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(exceptions.reportError(res))
  }

  CommentsController.destroy = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    models.Comment.getById(req.params.commentId)
      .then(function(comment) {
          if (comment.userId != req.user.id) {
            return Promise.reject(new ForbiddenException(
                "You can't delete another user's comment"
            ))
          }
          return comment.destroy()
        })
      .then(function(status) { res.jsonp({}) })
      .catch(exceptions.reportError(res))
  }

  return CommentsController
}
