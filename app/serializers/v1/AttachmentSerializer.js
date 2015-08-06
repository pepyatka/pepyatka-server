var models = require('../../models')
  , Serializer = models.Serializer
  , UserSerializer = models.UserSerializer

exports.addSerializer = function() {
  return new Serializer('attachments', {
    select: ['id', 'fileName', 'fileSize', 'url', 'thumbnailUrl',
             'mediaType', 'createdAt', 'updatedAt', 'createdBy', 'artist', 'title'],
    createdBy: { through: UserSerializer, embed: true }
  })
}
