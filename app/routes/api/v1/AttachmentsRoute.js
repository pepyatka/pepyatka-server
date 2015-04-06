"use strict";

var AttachmentsController = require('../../../controllers').AttachmentsController

exports.addRoutes = function(app) {
  app.post('/v1/attachments', AttachmentsController.create)
}
