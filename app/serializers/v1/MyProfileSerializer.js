var Serializer = require("../../models").Serializer
  , models = require("../../models")
  , SubscriptionSerializer = models.SubscriptionSerializer
  , SubscriptionRequestSerializer = models.SubscriptionRequestSerializer
  , SubscriberSerializer = models.SubscriberSerializer
  , AdminSerializer = models.AdminSerializer

exports.addSerializer = function() {
  return new Serializer('users', {
    select: ['id', 'username', 'type', 'screenName', 'email', 'statistics',
             'subscriptions', 'profilePictureLargeUrl', 'profilePictureMediumUrl',
             'banIds', 'subscribers', 'isPrivate', 'pendingSubscriptionRequests',
             'subscriptionRequests',
             'administrators'],
    subscriptions: { through: SubscriptionSerializer, embed: true },
    subscribers: { through: SubscriberSerializer },
    pendingSubscriptionRequests: { through: SubscriptionRequestSerializer, embed: true },
    subscriptionRequests: { through: SubscriptionRequestSerializer, embed: true },
    administrators: { through: AdminSerializer, embed: true }
  })
}
