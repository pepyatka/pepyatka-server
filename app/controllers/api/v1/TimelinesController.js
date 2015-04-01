"use strict";

var models = require('../../../models')
  , TimelineSerializer = models.TimelineSerializer

exports.addController = function(app) {
  var TimelineController = function() {
  }

  TimelineController.home = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found', status: 'fail'})

    var user = req.user

    user.getRiverOfNewsTimeline({
      offset: req.query.offset,
      limit: req.query.limit
    })
      .then(function(timeline) {
        new TimelineSerializer(timeline).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(422).send({}) })
  }

  TimelineController.posts = function(req, res) {
    var username = req.params.username

    models.User.findByUsername(username)
      .then(function(user) { return user.getPostsTimeline({
        offset: req.query.offset,
        limit: req.query.limit
      })}).then(function(timeline) {
        new TimelineSerializer(timeline).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(401).send({}) })
  }

  TimelineController.likes = function(req, res) {
    var username = req.params.username

    models.User.findByUsername(username)
      .then(function(user) { return user.getLikesTimeline({
        offset: req.query.offset,
        limit: req.query.limit
      })})
      .then(function(timeline) {
        new TimelineSerializer(timeline).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(422).send({}) })
  }


  TimelineController.comments = function(req, res) {
    var username = req.params.username

    models.User.findByUsername(username)
      .then(function(user) { return user.getCommentsTimeline({
        offset: req.query.offset,
        limit: req.query.limit
      })})
      .then(function(timeline) {
        new TimelineSerializer(timeline).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(422).send({}) })
  }

  TimelineController.myDiscussions = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found', status: 'fail'})

    var user = req.user

    user.getMyDiscussionsTimeline({
      offset: req.query.offset,
      limit: req.query.limit
    })
      .then(function(timeline) {
        new TimelineSerializer(timeline).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(422).send({}) })
  }

  return TimelineController
}
