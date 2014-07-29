var Serializer = require("../../models").Serializer

exports.addSerializer = function() {
  return new Serializer({ select: ['id', 'body', 'createdBy',
                                   'attachments', 'comments',
                                   'createdAt', 'updatedAt', 'likes', "groups"],
                          createdBy: { select: ['id', 'username', 'info'],
                                       info: { select: ['screenName'] } },
                          comments: { select: ['id', 'body', 'createdBy', 'info'],
                                      info: { select: ['screenName'] },
                                      createdBy: { select: ['id', 'username'] }},
                          likes: { select: ['id', 'username', 'info'],
                                   info: { select: ['screenName'] }},
                          attachments: { select: ["id", "media", "filename", "path", "thumbnail"]},
                          groups: { select: ['id', 'username', 'info'],
                                    info: {select: ['screenName'] } }
                        });
};
