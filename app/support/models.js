"use strict";

var _ = require("lodash")

var sep = ":"

exports.mkKey = function(keys) {
  return _.reduce(keys, function(acc, x) {
    return acc + sep + x
  })
}


