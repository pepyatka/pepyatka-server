var redis = require('../db')
  , db = redis.connect()

exports.User        = require('./models/user').addModel(db);
exports.Group       = require('./models/group').addModel(db);
exports.Post        = require('./models/post').addModel(db);
exports.Comment     = require('./models/comment').addModel(db);
exports.Timeline    = require('./models/timeline').addModel(db);
exports.Attachment  = require('./models/attachment').addModel(db);
exports.Tag         = require('./models/tag').addModel(db);
exports.Stats       = require('./models/stats').addModel(db);
exports.RSS         = require('./models/rss').addModel(db);
exports.FeedFactory = require('./models/feed-factory').addModel(db);

exports.AbstractSerializer = require('./serializers/abstract_serializer').addSerializer();
exports.Serializer = require("./serializers/serializer").addSerializer();
exports.FeedInfoSerializer = require("./serializers/feedinfo_serializer").addSerializer();
exports.CommentSerializer = require("./serializers/comment_serializer").addSerializer();
exports.TimelineSerializer = require("./serializers/timeline_serializer").addSerializer();
exports.SubscriptionSerializer = require("./serializers/subscription_serializer").addSerializer();
exports.SubscriberSerializer = require("./serializers/subscriber_serializer").addSerializer();
exports.UserSerializer = require('./serializers/user_serializer').addSerializer(exports.User);
exports.PostSerializer = require('./serializers/post_serializer').addSerializer(exports.Post);
