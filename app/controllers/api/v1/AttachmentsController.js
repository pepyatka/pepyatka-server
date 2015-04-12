"use strict";

var models = require('../../../models')
  , formidable = require('formidable')
  , AttachmentSerializer = models.AttachmentSerializer

exports.addController = function(app) {
  var AttachmentsController = function() {
  }

  AttachmentsController.create = function(req, res) {
    if (!req.user)
      return res.status(401).jsonp({ err: 'Not found' })

    var form = new formidable.IncomingForm()

    form.on('file', function(inputName, file) {
      req.user.newAttachment({ file: file })
        .then(function(newAttachment) {
          return newAttachment.create()
        })
        .then(function(newAttachment) {
          new AttachmentSerializer(newAttachment).toJSON(function(err, json) {
            res.jsonp(json)
          })
        })
        .catch(function(e) { res.status(422).send({}) })
    })

    form.parse(req)
  }

  return AttachmentsController
}
