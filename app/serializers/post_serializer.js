var async = require('async')
  , models = require('../models')
  , util = require('util')

exports.addSerializer = function() {
  var strategy = {
    select: ['id', 'body', 'createdBy', 'attachments', 'comments',
             'createdAt', 'updatedAt', 'updatedAt', 'likes', 'groups'],
    createdBy: { select: ['id', 'username', "info"],
                 info: {select: ["screenName"]}},
    comments: { select: ['id', 'body', 'createdBy'],
                createdBy: { select: ['id', 'username', 'info'],
                             info: { select: ['screenName'] }}},
    likes: { select: ['id', 'username', 'info'],
             info: { select: ['screenName'] }},
    groups: { select: ['id', 'username', 'info'],
              info: { select: ['screenName'] }}
  }

  var strategy = {
    select: ['id', 'body', 'createdBy', 'likes'],
//    createdBy: { through: models.UserSerializer },
    likes: { through: models.UserSerializer }
  }

  function PostSerializer(object) {
    this.object = object
    this.strategy = strategy
  }

  util.inherits(PostSerializer, models.AbstractSerializer)

  return PostSerializer
}
