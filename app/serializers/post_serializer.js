var Serializer = require("../models").Serializer;

exports.addSerializer = function() {
  return new Serializer({
    select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'updatedAt', 'likes', 'groups'],
    createdBy: { select: ['id', 'username', "info"],
                 info: {select: ["screenName", "email", "receiveEmails"]}},
    comments: { select: ['id', 'body', 'createdBy'],
                createdBy: { select: ['id', 'username', 'info'],
                             info: {select: ['screenName', "email", "receiveEmails"] }}},
    attachments: { select: ["id", "media", "filename", "path", "thumbnail"]},
    likes: { select: ['id', 'username', 'info'],
             info: {select: ['screenName', "email", "receiveEmails"] }},
    groups: { select: ['id', 'username', 'info'],
              info: {select: ['screenName', "email", "receiveEmails"] }}
  });
};
