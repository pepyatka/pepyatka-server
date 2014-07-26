var models = require("../../models")
  , Serializer = models.Serializer
  , SubscriptionSerializer = models.SubscriptionSerializerV1
  , SubscriberSerializer = models.SubscriberSerializerV1;

exports.addSerializer = function() {
  return new Serializer({
    select: ['id', 'username', 'type', 'subscriptions', 'subscribers', 'admins'],
    subscriptions: {
      select: ['id', 'user'],
      user: { through: SubscriptionSerializer}
    },
    subscribers: { through: SubscriberSerializer }
  });
};
