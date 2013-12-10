var models = require("../models")
  , Serializer = models.Serializer
  , UserSerializer = models.UserSerializer
  , SubscriptionsSerializer = models.SubscriptionSerializer
  , CommentSerializer = models.CommentSerializer
  , SubscribersSerializer = models.SubscriberSerializer;

exports.addSerializer = function() {
  return new Serializer({
    select: ['name', 'id', 'posts', 'user', 'subscribers'],
    posts: {
      select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes', 'groups'],
      createdBy: { through: UserSerializer },
      comments: { through: CommentSerializer },
      likes: { through: UserSerializer },
      groups: { through: UserSerializer }
    },
    user: {
      select: ['id', 'username', 'subscribers', 'subscriptions', 'statistics', 'type', 'admins', 'info'],
      info: {select: ['screenName'] },
      subscriptions: { through: SubscriptionsSerializer },
      subscribers: { through: SubscribersSerializer }
    },
    subscribers: { through: SubscribersSerializer }
  });
};
