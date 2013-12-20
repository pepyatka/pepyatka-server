var Serializer = require("../models").Serializer;

exports.addSerializer = function() {
  return new Serializer({ select: ['id', 'body', 'createdAt', 'updatedAt', 'createdBy', 'postId'],
                          createdBy: { select: ['id', 'username', 'info'],
                                       info: { select: ['screenName'] } }
                        });
};
