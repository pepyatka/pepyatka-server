var models = require("../../models")
  , Serializer = models.Serializer
  , AdminSerializer = models.AdminSerializer
  , SubscriptionSerializer = models.SubscriptionSerializer

exports.addSerializer = function() {
  return new Serializer('groups', {
    select: ['id', 'username', 'type', 'screenName',
             'profilePictureLargeUrl', 'profilePictureMediumUrl',
             'updatedAt', 'isPrivate',
             'timelines', 'administrators'],
    timelines: { through: SubscriptionSerializer, embed: true },
    administrators: { through: AdminSerializer, embed: true }
  })
}
