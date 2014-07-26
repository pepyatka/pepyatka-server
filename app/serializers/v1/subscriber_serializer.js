var Serializer = require("../../models").Serializer;

exports.addSerializer = function() {
  return new Serializer({
    select: ['id', 'username', 'info', "admins"],
    info: { select: ['screenName'] }
  });
};
