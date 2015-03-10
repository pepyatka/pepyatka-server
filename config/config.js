"use strict";

var env = process.env.NODE_ENV || 'development'
  , configName = "./environments/" + env
  , config

exports.load = function() {
  if (!config) config = require(configName).getConfig()
  return config
}
