var models = require("../../models")
  , Serializer = models.Serializer
  , UserSerializer = models.UserSerializerV2
  , SubscriptionSerializer = models.SubscriptionSerializerV2
  , CommentSerializer = models.CommentSerializerV2
  , SubscriberSerializer = models.SubscriberSerializerV2
  , AttachmentSerializer = models.AttachmentSerializerV2
  , PostSerializer = models.PostSerializerV2

exports.addSerializer = function() {
  return new Serializer({
    select: ['name', 'id', 'posts', 'user', 'subscribers'],
    posts: { through: PostSerializer, embed: true },
    user: {
      select: ['id', 'username', 'subscribers', 'subscriptions', 'statistics', 'type', 'admins', 'info'],
      info: { select: ['screenName'] },
      subscriptions: { through: SubscriptionSerializer, embed: true },
      subscribers: { through: SubscriberSerializer, embed: true }
    },
    subscribers: { through: SubscriberSerializer, embed: true }
  });
};
