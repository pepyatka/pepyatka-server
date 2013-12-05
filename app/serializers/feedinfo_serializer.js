var Serializer = require("../models").Serializer;

exports.addSerializer = function() {
  return new Serializer({
    select: ['id', 'username', 'type', 'subscriptions', 'subscribers', 'admins'],
    subscriptions: {
      select: ['id', 'user'],
      user: { select: ['id', 'username', 'type', 'admins', 'info'],
              info: { select: ['screenName'] } }
    },
    subscribers: {
      select: ['id', 'username', 'type', 'admins', 'info'],
      info: { select: ['screenName'] }
    }
  });
};
