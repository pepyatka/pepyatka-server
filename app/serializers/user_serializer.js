var async = require('async')
  , models = require('../models')
  , util = require('util')

exports.addSerializer = function() {
  var strategy = {
    select: ['id', 'username', 'type', 'info', 'rss'],
    info: { select: ['screenName'] }
  }

  function UserSerializer(object) {
    this.object = object
    this.strategy = strategy
  }

  util.inherits(UserSerializer, models.AbstractSerializer)

  return UserSerializer
}
