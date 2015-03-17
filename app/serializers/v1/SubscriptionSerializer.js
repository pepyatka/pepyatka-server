var Serializer = require("../../models").Serializer

exports.addSerializer = function() {
  return new Serializer("subscriptions", {
    select: ['id', 'user', 'name', "admins"],
    user: { select: ['id', 'username', 'type', 'screenName'] }
  })
}
