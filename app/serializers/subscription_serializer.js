var Serializer = require("../models").Serializer;

exports.addSerializer = function() {
  return new Serializer({
    select: ['id', 'user', 'name'],
    user: { select: ['id', 'username', 'type', 'info'],
            info: { select: ['screenName'] } }
  });
};
