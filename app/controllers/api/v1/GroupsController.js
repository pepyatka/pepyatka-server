"use strict";

var models = require('../../../models')
  , GroupSerializer = models.GroupSerializer

exports.addController = function(app) {
  var GroupsController = function() {
  }

  GroupsController.create = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found', status: 'fail'})

    var newGroup = new models.Group({
      username: req.body.group.username,
      screenName: req.body.group.screenName
    })

    newGroup.create()
        .then(function(group) {
          new GroupSerializer(group).toJSON(function(err, json) {
            res.jsonp(json)
          })
        })
        .catch(function(e) {
          res.status(401).jsonp({ err: 'username ' + newGroup.username + ' already exists', status: 'fail'})
        })

  }

  return GroupsController
}
