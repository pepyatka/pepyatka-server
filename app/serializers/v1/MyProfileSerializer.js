var Serializer = require("../../models").Serializer
  , models = require("../../models")
  , SubscriptionSerializer = models.SubscriptionSerializer
  , SubscriberSerializer = models.SubscriberSerializer

exports.addSerializer = function() {
  return new Serializer('users', {
    select: ['id', 'username', 'type', 'screenName', 'email', 'statistics',
             'subscriptions', 'profilePictureLargeUrl', 'profilePictureMediumUrl',
             'banIds', 'subscribers'],
    subscriptions: { through: SubscriptionSerializer, embed: true },
    subscribers: { through: SubscriberSerializer }
  })
}
