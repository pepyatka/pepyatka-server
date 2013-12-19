var Serializer = require("../models").Serializer;

exports.addSerializer = function() {
  return new Serializer({ select: ['id', 'username'] });
};

