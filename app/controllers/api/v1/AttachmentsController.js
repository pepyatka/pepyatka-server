"use strict";

import formidable from 'formidable'

import { AttachmentSerializer } from '../../../models'
import exceptions from '../../../support/exceptions'

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
        .catch(function(e) {
          let errorDetails = {}
          if (e.message && e.message.indexOf('Corrupt image') > -1) {
            errorDetails = { message: 'Corrupt image' }
          }
          res.status(422).send(errorDetails)
        })
    })

    form.parse(req)
  }

  return AttachmentsController
}
