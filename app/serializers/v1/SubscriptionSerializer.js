var models = require('../../models')
  , Serializer = models.Serializer
  , SubscriberSerializer = models.SubscriberSerializer

exports.addSerializer = function() {
  return new Serializer('subscriptions', {
    select: ['id', 'user', 'name'],
    user: { through: SubscriberSerializer, embed: true }
  })
}
