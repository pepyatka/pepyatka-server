var models = require("../../models")
  , Serializer = models.Serializer
  , SubscriptionSerializer = models.SubscriptionSerializer
  , SubscriberSerializer = models.SubscriberSerializer
  , PostSerializer = models.PostSerializer
  , UserSerializer = models.UserSerializer

exports.addSerializer = function() {
  return new Serializer("timelines", {
    select: ['name', 'id', 'posts', 'user', 'subscribers'],
    posts: { through: PostSerializer, embed: true },
    user: { through: UserSerializer, embed: true },
    subscribers: { through: SubscriberSerializer, embed: true }
  })
}
