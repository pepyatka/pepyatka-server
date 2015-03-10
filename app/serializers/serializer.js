"use strict";

var AbstractSerializer = require("../models").AbstractSerializer
var inherits = require("util").inherits

exports.addSerializer = function() {
  var Serializer = function(name, strategy) {
    var SpecializedSerializer = function(object) {
      this.object = object
      this.strategy = strategy
      this.name = name
    }

    inherits(SpecializedSerializer, AbstractSerializer)

    return SpecializedSerializer
  }

  return Serializer
}
