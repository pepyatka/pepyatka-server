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
exports.Attachment    = require('./models/attachment').addModel(database)
exports.Comment       = require('./models/comment').addModel(database)

exports.UserSerializer         = require('./serializers/v1/UserSerializer').addSerializer()
exports.LikeSerializer         = require('./serializers/v1/LikeSerializer').addSerializer()
exports.GroupSerializer        = require('./serializers/v1/GroupSerializer').addSerializer()
exports.AttachmentSerializer   = require('./serializers/v1/AttachmentSerializer').addSerializer()
exports.CommentSerializer      = require('./serializers/v1/CommentSerializer').addSerializer()
exports.SubscriberSerializer   = require('./serializers/v1/SubscriberSerializer').addSerializer()
exports.SubscriptionSerializer = require('./serializers/v1/SubscriptionSerializer').addSerializer()
exports.PostSerializer         = require('./serializers/v1/PostSerializer').addSerializer()
exports.TimelineSerializer     = require('./serializers/v1/TimelineSerializer').addSerializer()
