var Serializer = require("../../models").Serializer

exports.addSerializer = function() {
  return new Serializer("subscribers", {
    select: ['id', 'username', "admins", 'screenName']
  })
}
