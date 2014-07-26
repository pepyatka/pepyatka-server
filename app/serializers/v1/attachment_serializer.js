var Serializer = require("../../models").Serializer;

exports.addSerializer = function() {
  return new Serializer({ select: ["id", "media", "filename", "path", "thumbnail", "size"]});
};
