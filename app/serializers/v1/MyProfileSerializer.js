var Serializer = require("../../models").Serializer
  , models = require("../../models")
  , SubscriptionSerializer = models.SubscriptionSerializer

exports.addSerializer = function() {
  return new Serializer('users', {
    select: ['id', 'username', 'type', 'screenName', 'email', 'statistics',
             'subscriptions', 'profilePictureLargeUrl', 'profilePictureMediumUrl',
             'banIds'],
    subscriptions: { through: SubscriptionSerializer, embed: true }
  })
}
