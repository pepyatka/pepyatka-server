"use strict";

var config = require('./../config').load()

exports.init = function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', config.origin)
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-Authentication-Token")

  return next()
}
