"use strict";

var config = require('./../config').load()

exports.init = function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', config.origin)
  return next()
}
