"use strict";

var models = require('../../../models')
  , TimelineSerializer = models.TimelineSerializer
  , exceptions = require('../../../support/exceptions')

exports.addController = function(app) {
  var TimelineController = function() {
  }

  TimelineController.home = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found', status: 'fail'})

    var user = req.user

    user.getRiverOfNewsTimeline({
      offset: req.query.offset,
      limit: req.query.limit,
      currentUser: user.id
    })
      .then(function(timeline) {
        new TimelineSerializer(timeline).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(function(e) { res.status(422).send({}) })
  }

  TimelineController.directs = function(req, res) {
    var user = req.user

    user.getDirectsTimeline({
      offset: req.query.offset,
      limit: req.query.limit,
      currentUser: req.user ? req.user.id : null
    })
      .then(function(timeline) {
        new TimelineSerializer(timeline).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(function(e) { exceptions.reportError(res)(e) })
  }

  TimelineController.posts = async function(req, res) {
    try {
      var username = req.params.username

      var user = await models.User.findByUsername(username)
      var currentUser = req.user ? req.user.id : null
      var timeline = await user.getPostsTimeline({
        offset: req.query.offset,
        limit: req.query.limit,
        currentUser: currentUser
      })

      var valid = await timeline.validateCanShow(currentUser)

      // this is a private timeline
      if (!valid)
        timeline = timeline.turnIntoPrivate()

      new TimelineSerializer(timeline).toJSON(function(err, json) {
        res.jsonp(json)
      })
    } catch(e) {
      exceptions.reportError(res)(e)
    }
  }

  TimelineController.likes = async function(req, res) {
    try {
      var username = req.params.username

      var user = await models.User.findByUsername(username)
      var currentUser = req.user ? req.user.id : null
      var timeline = await user.getLikesTimeline({
        offset: req.query.offset,
        limit: req.query.limit,
        currentUser: currentUser
      })

      var valid = await timeline.validateCanShow(currentUser)

      // this is a private timeline
      if (!valid)
        timeline = timeline.turnIntoPrivate()

      new TimelineSerializer(timeline).toJSON(function(err, json) {
        res.jsonp(json)
      })
    } catch(e) {
      exceptions.reportError(res)(e)
    }
  }

  TimelineController.comments = async function(req, res) {
    try {
      var username = req.params.username

      var user = await models.User.findByUsername(username)
      var currentUser = req.user ? req.user.id : null
      var timeline = await user.getCommentsTimeline({
        offset: req.query.offset,
        limit: req.query.limit,
        currentUser: currentUser
      })

      var valid = await timeline.validateCanShow(currentUser)

      // this is a private timeline
      if (!valid)
        timeline = timeline.turnIntoPrivate()

      new TimelineSerializer(timeline).toJSON(function(err, json) {
        res.jsonp(json)
      })
    } catch(e) {
      exceptions.reportError(res)(e)
    }
  }

  TimelineController.myDiscussions = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found', status: 'fail'})

    var user = req.user

    user.getMyDiscussionsTimeline({
      offset: req.query.offset,
      limit: req.query.limit,
      currentUser: req.user ? req.user.id : null
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
