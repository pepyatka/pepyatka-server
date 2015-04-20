var models = require('../../models')
  , Serializer = models.Serializer
  , UserSerializer = models.UserSerializer

exports.addSerializer = function() {
  return new Serializer('attachments', {
    select: ['id', 'fileName', 'fileSize', 'url', 'thumbnailUrl', 'createdAt', 'updatedAt', 'createdBy'],
    createdBy: { through: UserSerializer, embed: true }
  })
}
