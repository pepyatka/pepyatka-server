import {Serializer, SubscriberSerializer} from '../../models'

exports.addSerializer = function() {
  return new Serializer('subscriptions', {
    select: ['id', 'user', 'name'],
    user: { through: SubscriberSerializer, embed: true }
  })
}
