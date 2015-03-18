"use strict";

var models = require('../../../models')
  , PostSerializer = models.PostSerializer

exports.addController = function(app) {
  var PostsController = function() {
  }

  PostsController.create = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    req.user.newPost({
      body: req.body.body
    })
      .then(function(newPost) { return newPost.create() })
      .then(function(newPost) {
        new PostSerializer(newPost).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(401).send({}) })
  }

  return PostsController
}
