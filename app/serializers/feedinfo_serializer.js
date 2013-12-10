var models = require("../models")
  , Serializer = models.Serializer
  , SubscriptionSerializer = models.SubscriptionSerializer
  , SubscriberSerializer = models.SubscriberSerializer;

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
