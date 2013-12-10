var models = require("../models")
  , Serializer = models.Serializer
  , AttachmentSerializer = models.AttachmentSerializer
  , UserSerializer = models.UserSerializer
  , CommentSerializer = models.CommentSerializer;

exports.addSerializer = function() {
  return new Serializer({
    select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'updatedAt', 'likes', 'groups'],
    createdBy: { through: UserSerializer },
    comments: { through: CommentSerializer },
    attachments: { through: AttachmentSerializer },
    likes: { through: UserSerializer },
    groups: { through: UserSerializer  }
  });
};
