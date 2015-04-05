var Serializer = require("../../models").Serializer

exports.addSerializer = function() {
  return new Serializer('groups', {
    select: ['id', 'username', 'type', 'screenName', 'visibility']
  })
}
