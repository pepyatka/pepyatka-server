var models = require("../../models")
  , Serializer = models.Serializer
  , UserSerializer = models.UserSerializer
  , AttachmentSerializer = models.AttachmentSerializer
  , CommentSerializer = models.CommentSerializer
  , GroupSerializer = models.GroupSerializer

exports.addSerializer = function() {
  return new Serializer("posts", {
    select: ['id', 'body', 'attachments', 'createdBy', 'comments', 'createdAt', 'updatedAt', 'updatedAt', 'likes', 'groups', 'isHidden'],
    attachments: { through: AttachmentSerializer, embed: true },
    createdBy: { through: UserSerializer, embed: true },
    comments: { through: CommentSerializer, embed: true },
    likes: { through: UserSerializer, embed: true },
    groups: { through: GroupSerializer, embed: true }
  })
}
