"use strict";

var models = require('../../../models')
  , Group = models.Group
  , User = models.User
  , GroupSerializer = models.GroupSerializer
  , exceptions = require('../../../support/exceptions')
  , formidable = require('formidable')

exports.addController = function(app) {
  /**
   * @constructor
   */
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
    models.Group.getById(req.params.userId).bind({})
      .then(function(group) {
        this.group = group
        return group.validateCanUpdate()
      })
      .then(function() {
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
          return group.validateCanUpdate(req.user)
        })
        .then(function() {
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
        .catch(exceptions.reportError(res))
  }

  GroupsController.admin = function(req, res) {
    GroupsController.changeAdminStatus(req, res, true)
  }

  GroupsController.unadmin = function(req, res) {
    GroupsController.changeAdminStatus(req, res, false)
  }

  GroupsController.updateProfilePicture = function(req, res) {
    Group.findByUsername(req.params.groupName).bind({})
      .then(function(group) {
        return group.validateCanUpdate(req.user)
      })
      .then(function(group) {
        var form = new formidable.IncomingForm()

        form.on('file', function(inputName, file) {
          group.updateProfilePicture(file)
            .then(function() {
              res.jsonp({ message: 'The profile picture of the group has been updated' })
            })
            .catch(exceptions.reportError(res))
        })

        form.parse(req)
      })
      .catch(exceptions.reportError(res))
  }

  return GroupsController
}
