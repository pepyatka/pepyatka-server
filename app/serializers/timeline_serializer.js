var Serializer = require("../models").Serializer;

exports.addSerializer = function() {
  return new Serializer({
    select: ['name', 'id', 'posts', 'user', 'subscribers'],
    posts: {
      select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes', 'groups'],
      createdBy: { select: ['id', 'username', 'info'],
                   info: {select: ['screenName'] } },
      comments: { select: ['id', 'body', 'createdBy'],
                  createdBy: { select: ['id', 'username', 'info'],
                               info: {select: ['screenName'] } }
                },
      likes: { select: ['id', 'username', 'info'],
               info: {select: ['screenName'] } },
      groups: { select: ['id', 'username', 'info'],
                info: {select: ['screenName'] } }
    },
    user: {
      select: ['id', 'username', 'subscribers', 'subscriptions', 'statistics', 'type', 'admins', 'info'],
      info: {select: ['screenName'] },
      subscriptions: { select: ['id', 'user', 'name'],
                       user: { select: ['id', 'username'] }
      },
      subscribers: { select: ['id', 'username'] }
    },
    subscribers: { select: ['id', 'username'] }
  });
};
