var models = require("../../models")
  , Serializer = models.Serializer
  , UserSerializer = models.UserSerializerV1
  , SubscriptionSerializer = models.SubscriptionSerializerV1
  , CommentSerializer = models.CommentSerializerV1
  , SubscriberSerializer = models.SubscriberSerializerV1
  , AttachmentSerializer = models.AttachmentSerializerV1
  , PostSerializer = models.PostSerializerV1

exports.addSerializer = function() {
  return new Serializer({
    select: ['name', 'id', 'posts', 'user', 'subscribers'],
    posts: { through: PostSerializer },
    user: {
      select: ['id', 'username', 'subscribers', 'subscriptions', 'statistics', 'type', 'admins', 'info'],
      info: { select: ['screenName'] },
      subscriptions: { through: SubscriptionSerializer },
      subscribers: { through: SubscriberSerializer }
    },
    subscribers: { through: SubscriberSerializer }
  });
};
