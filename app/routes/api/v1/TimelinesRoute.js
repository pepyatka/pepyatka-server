"use strict";

var TimelinesController = require('../../../controllers').TimelinesController

exports.addRoutes = function(app) {
  app.get('/v1/timelines/home', TimelinesController.home)
  app.get('/v1/timelines/:username/posts', TimelinesController.posts)
}
