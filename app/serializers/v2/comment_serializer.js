var models = require("../../models")
  , Serializer = models.Serializer
  , UserSerializer = models.UserSerializerV2

exports.addSerializer = function() {
  return new Serializer({
    select: ['id', 'body', 'createdAt', 'updatedAt', 'createdBy', 'postId'],
    createdBy: { through: UserSerializer, embed: true }
  });
};
