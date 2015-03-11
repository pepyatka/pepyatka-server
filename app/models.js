"use strict";

var redis = require('../config/database')
  , database = redis.connect()

exports.AbstractSerializer = require('./serializers/abstract_serializer').addSerializer()
exports.Serializer         = require("./serializers/serializer").addSerializer()

exports.AbstractModel = require('./models/abstract_model').addModel(database)
exports.User          = require('./models/user').addModel(database)
exports.Group         = require('./models/group').addModel(database)
exports.FeedFactory   = require('./models/feed-factory').addModel(database)
exports.Post          = require('./models/post').addModel(database)
exports.Timeline      = require('./models/timeline').addModel(database)
exports.Comment       = require('./models/comment').addModel(database)









