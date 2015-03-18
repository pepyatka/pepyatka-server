var models = require("../../models")
  , Serializer = models.Serializer
  , UserSerializer = models.UserSerializer
  , CommentSerializer = models.CommentSerializer

exports.addSerializer = function() {
  return new Serializer("posts", {
    select: ['id', 'body', 'createdBy', 'comments', 'createdAt', 'updatedAt', 'updatedAt', 'likes'],
    createdBy: { through: UserSerializer, embed: true },
    comments: { through: CommentSerializer, embed: true },
    likes: { through: UserSerializer, embed: true }
  })
}
