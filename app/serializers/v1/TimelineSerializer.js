var models = require("../../models")
  , Serializer = models.Serializer
  , SubscriptionSerializer = models.SubscriptionSerializer
  , SubscriberSerializer = models.SubscriberSerializer
  , PostSerializer = models.PostSerializer

exports.addSerializer = function() {
  return new Serializer("timelines", {
    select: ['name', 'id', 'posts', 'user', 'subscribers'],
    posts: { through: PostSerializer, embed: true },
    user: {
      select: ['id', 'username', 'subscribers', 'subscriptions', 'type'],
      subscriptions: { through: SubscriptionSerializer, embed: true },
      subscribers: { through: SubscriberSerializer, embed: true }
    },
    subscribers: { through: SubscriberSerializer, embed: true }
  })
}
