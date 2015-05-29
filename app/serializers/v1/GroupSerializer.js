var models = require("../../models")
  , Serializer = models.Serializer
  , UserSerializer = models.UserSerializer
  , SubscriptionSerializer = models.SubscriptionSerializer

exports.addSerializer = function() {
  return new Serializer('groups', {
    select: ['id', 'username', 'type', 'screenName', 'isPrivate', 'administratorIds', 'timelines'],
    timelines: { through: SubscriptionSerializer, embed: true }
  })
}
