var models = require("../../models")
  , Serializer = models.Serializer
  , AttachmentSerializer = models.AttachmentSerializerV2
  , UserSerializer = models.UserSerializerV2
  , CommentSerializer = models.CommentSerializerV2

exports.addSerializer = function() {
  return new Serializer({
    select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'updatedAt', 'likes', 'groups'],
    createdBy: { through: UserSerializer, embed: true },
    comments: { through: CommentSerializer, embed: true },
    attachments: { through: AttachmentSerializer, embed: true },
    likes: { through: UserSerializer, embed: true },
    groups: { through: UserSerializer, embed: true  }
  });
};
