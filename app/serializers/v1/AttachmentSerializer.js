var models = require('../../models')
  , Serializer = models.Serializer
  , UserSerializer = models.UserSerializer

exports.addSerializer = function() {
  return new Serializer('attachments', {
    select: ['id', 'filename', 'isImage', 'createdAt', 'updatedAt', 'createdBy'],
    createdBy: { through: UserSerializer, embed: true }
  })
}
