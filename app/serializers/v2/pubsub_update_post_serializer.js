var Serializer = require("../../models").Serializer

exports.addSerializer = function() {
  return new Serializer({ select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes'],
                          createdBy: { select: ['id', 'username', 'info'],
                                       info: { select: ['screenName'] } },
                          comments: { select: ['id', 'body', 'createdBy'],
                                      createdBy: { select: ['id', 'username', 'info'],
                                                   info: { select: ['screenName'] } }},
                          likes: { select: ['id', 'username', 'info'],
                                   info: { select: ['screenName'] }}
                        });
};
