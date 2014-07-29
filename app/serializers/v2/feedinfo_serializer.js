var models = require("../../models")
  , Serializer = models.Serializer
  , SubscriptionSerializer = models.SubscriptionSerializerV2
  , SubscriberSerializer = models.SubscriberSerializerV2

exports.addSerializer = function() {
  return new Serializer({
    select: ['id', 'username', 'type', 'subscriptions', 'subscribers', 'admins'],
    subscriptions: {
      select: ['id', 'user'],
      user: { through: SubscriptionSerializer, embed: true }
    },
    subscribers: { through: SubscriberSerializer, embed: true }
  });
};
