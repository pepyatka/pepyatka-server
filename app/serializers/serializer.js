var AbstractSerializer = require("../models").AbstractSerializer;
var inherits = require("util").inherits;

exports.addSerializer = function() {
  var Serializer = function(strategy) {
    var SpecializedSerializer = function(object) {
      this.object = object;
      this.strategy = strategy;
    };

    inherits(SpecializedSerializer, AbstractSerializer);

    return SpecializedSerializer;
  };

  return Serializer;
};
