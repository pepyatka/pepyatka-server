var models = require("../../models")
  , Serializer = models.Serializer
  , UserSerializer = models.UserSerializer

exports.addSerializer = function() {
  return new Serializer('users', {
    select: ['id', 'username', 'type', 'screenName', 'statistics',
             'profilePictureLargeUrl', 'profilePictureMediumUrl', 'administratorIds',
             'updatedAt']
  })
}
