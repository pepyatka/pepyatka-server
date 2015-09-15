"use strict";

var BookmarkletController = require('../../../controllers').BookmarkletController

exports.addRoutes = function(app) {
  app.post('/v1/bookmarklet', BookmarkletController.create)
}
