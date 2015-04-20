"use strict";

var models = require('../../../models')
  , Group = models.Group
  , User = models.User
  , GroupSerializer = models.GroupSerializer
  , exceptions = require('../../../support/exceptions')

exports.addController = function(app) {
  var GroupsController = function() {
  }

  GroupsController.create = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found', status: 'fail'})

    var newGroup = new Group({
      username: req.body.group.username,
      screenName: req.body.group.screenName,
      isPrivate: req.body.group.isPrivate
    })

    newGroup.create(req.user.id)
      .then(function(group) {
        new GroupSerializer(group).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(exceptions.reportError(res))
  }

  GroupsController.update = function(req, res) {
    var attrs = {
      screenName: req.body.user.screenName,
      isPrivate: req.body.user.isPrivate
    }
    models.Group.findById(req.params.userId).bind({})
      .then(function(group) {
        this.group = group
        return group.getAdministratorIds()
      })
      .then(function(adminIds) {
        if (!req.user || adminIds.indexOf(req.user.id) == -1) {
          return Promise.reject('not an admin')
        }

        return this.group.update(attrs)
      })
      .then(function(group) {
        new models.GroupSerializer(group).toJSON(function(err, json) {
          res.jsonp(json)
        })
      })
      .catch(exceptions.reportError(res))
  }

  GroupsController.changeAdminStatus = function(req, res, newStatus) {
    Group.findByUsername(req.params.groupName).bind({})
        .then(function(group) {
          this.group = group
          return group.getAdministratorIds()
        })
        .then(function(adminIds) {
          if (!req.user || adminIds.indexOf(req.user.id) == -1) {
            return Promise.reject('not an admin')
          }
          return User.findByUsername(req.params.adminName)
        })
        .then(function(newAdmin) {
          if (newStatus) {
            return this.group.addAdministrator(newAdmin.id)
          } else {
            return this.group.removeAdministrator(newAdmin.id)
          }
        })
        .then(function() {
          res.jsonp({err: null, status: 'success'})
        })
        .catch(function(e) {
          res.status(401).jsonp({ err: 'failed to add admin', status: 'fail'})
        })
  }

  GroupsController.admin = function(req, res) {
    GroupsController.changeAdminStatus(req, res, true)
  }

  GroupsController.unadmin = function(req, res) {
    GroupsController.changeAdminStatus(req, res, false)
  }

  return GroupsController
}
