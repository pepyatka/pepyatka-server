"use strict";

var Promise = require('bluebird')
  , models = require('../../../models')
  , exceptions = require('../../../support/exceptions')
  , PostSerializer = models.PostSerializer
  , FeedFactory = models.FeedFactory
  , ForbiddenException = exceptions.ForbiddenException

exports.addController = function(app) {
  /**
   * @constructor
   */
  var PostsController = function() {
  }

  PostsController.create = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    var feeds = []
    req.body.meta = req.body.meta || {}
    if (Array.isArray(req.body.meta.feeds)) {
      feeds = req.body.meta.feeds
    } else if (req.body.meta.feeds) {
      feeds = [req.body.meta.feeds]
    } else {
      feeds = [req.user.username]
    }

    Promise.map(feeds, function(username) {
      return FeedFactory.findByUsername(username)
        .then(function(feed) {
          return feed.validateCanPost(req.user)
        })
        .then(function(feed) {
          return feed.getPostsTimelineId()
        })
      })
      .then(function(timelineIds) {
        return req.user.newPost({
          body: req.body.post.body,
          attachments: req.body.post.attachments,
          timelineIds: timelineIds
        })
      })
      .then(function(newPost) { return newPost.create() })
      .then(function(newPost) {
        new PostSerializer(newPost).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(exceptions.reportError(res))
  }

  PostsController.update = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    models.Post.findById(req.params.postId)
      .then(function(post) {
        if (post.userId != req.user.id) {
          return Promise.reject(new ForbiddenException(
              "You can't update another user's post"))
        }
        return post.update({
          body: req.body.post.body
        })
      })
      .then(function(post) {
        new PostSerializer(post).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(exceptions.reportError(res))
  }

  PostsController.show = async function(req, res) {
    try {
      var post = await models.Post.getById(req.params.postId, {
        maxComments: req.query.maxComments,
        maxLikes: req.query.maxLikes,
        currentUser: req.user ? req.user.id : null
      })

      var author = await models.User.findById(post.userId)
      var banIds = await author.getBanIds()

      if (banIds.indexOf(post.currentUser) >= 0)
        throw new ForbiddenException("This user has prevented you from seeing their posts")

      var json = new PostSerializer(post).promiseToJSON()

      res.jsonp(await json)
    } catch(e) {
      exceptions.reportError(res)(e)
    }
  }

  PostsController.like = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    models.Post.getById(req.params.postId)
      .then(function(post) { return post.addLike(req.user.id) })
      .then(function() { res.status(200).send({}) })
      .catch(exceptions.reportError(res))
  }

  PostsController.unlike = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    models.Post.getById(req.params.postId)
      .then(function(post) { return post.removeLike(req.user.id) })
      .then(function() { res.status(200).send({}) })
      .catch(exceptions.reportError(res))
  }

  PostsController.destroy = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    models.Post.getById(req.params.postId)
      .then(function(post) {
          if (post.userId != req.user.id) {
            return Promise.reject(new ForbiddenException(
                "You can't delete another user's post"))
          }
          return post.destroy()
        })
      .then(function(status) { res.jsonp({}) })
      .catch(exceptions.reportError(res))
  }

  PostsController.hide = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    models.Post.getById(req.params.postId)
      .then(function(post) { return post.hide(req.user.id) })
      .then(function() { res.jsonp({} )})
      .catch(exceptions.reportError(res))
  }

  PostsController.unhide = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    models.Post.getById(req.params.postId)
      .then(function(post) { return post.unhide(req.user.id) })
      .then(function() { res.jsonp({} )})
      .catch(exceptions.reportError(res))
  }

  return PostsController
}
