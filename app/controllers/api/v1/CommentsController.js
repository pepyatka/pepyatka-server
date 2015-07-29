"use strict";

import models, {CommentSerializer} from '../../../models'
import exceptions, {ForbiddenException} from '../../../support/exceptions'

exports.addController = function(app) {
  class CommentsController {
    static async create(req, res) {
      if (!req.user)
        return res.status(401).jsonp({ err: 'Not found' })

      try {
        var valid = await req.user.validateCanComment(req.body.comment.postId)

        // this is a private post
        if (!valid)
          throw new ForbiddenException("Not found")

        var newComment = await req.user.newComment({
          body: req.body.comment.body,
          postId: req.body.comment.postId
        })

        await newComment.create()

        new CommentSerializer(newComment).toJSON(function(err, json) {
          res.jsonp(json)
        })
      } catch (e) {
        exceptions.reportError(res)(e)
      }
    }

    static async update(req, res) {
      if (!req.user)
        return res.status(401).jsonp({ err: 'Not found' })

      try {
        var comment = await models.Comment.getById(req.params.commentId)

        if (comment.userId != req.user.id) {
          throw new ForbiddenException(
            "You can't update another user's comment"
          )
        }

        await comment.update({
          body: req.body.comment.body
        })

        new CommentSerializer(comment).toJSON(function (err, json) {
          res.jsonp(json)
        })
      } catch (e) {
        exceptions.reportError(res)(e)
      }
    }

    static async destroy(req, res) {
      if (!req.user)
        return res.status(401).jsonp({ err: 'Not found' })

      try {
        var comment = await models.Comment.getById(req.params.commentId);

        if (comment.userId != req.user.id) {
          throw new ForbiddenException(
            "You can't delete another user's comment"
          )
        }

        await comment.destroy()

        res.jsonp({})
      } catch (e) {
        exceptions.reportError(res)(e)
      }
    }
  }

  return CommentsController
}
