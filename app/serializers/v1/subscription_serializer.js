var Serializer = require("../../models").Serializer;

exports.addSerializer = function() {
  return new Serializer({
    select: ['id', 'user', 'name', "admins"],
    user: { select: ['id', 'username', 'type', 'info'],
            info: { select: ['screenName'] } }
  });
};
