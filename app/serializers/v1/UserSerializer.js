var Serializer = require("../../models").Serializer

exports.addSerializer = function() {
  return new Serializer('users', {
    select: ['id', 'username', 'type', 'screenName', 'email', 'statistics']
  })
}
