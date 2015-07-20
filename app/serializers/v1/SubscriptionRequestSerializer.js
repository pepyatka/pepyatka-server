import {Serializer} from '../../models'

exports.addSerializer = function() {
  return new Serializer('requests', {
    select: ['id', 'username', 'screenName',
             'profilePictureLargeUrl', 'profilePictureMediumUrl']
  })
}
