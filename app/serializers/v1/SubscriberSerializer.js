import {Serializer} from '../../models'

exports.addSerializer = function() {
  return new Serializer("subscribers", {
    select: ['id', 'username', 'screenName', 'type', 'updatedAt', 'createdAt',
             'profilePictureLargeUrl', 'profilePictureMediumUrl']
  })
}
