var redis = require('../db')
  , db = redis.connect()

exports.AbstractSerializer = require('./serializers/abstract_serializer').addSerializer();
exports.Serializer = require("./serializers/serializer").addSerializer();

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

exports.AdminSerializerV1 = require("./serializers/v1/admin_serializer").addSerializer();
exports.UserSerializerV1 = require('./serializers/v1/user_serializer').addSerializer(exports.User);
exports.CommentSerializerV1 = require("./serializers/v1/comment_serializer").addSerializer();
exports.SubscriptionSerializerV1 = require("./serializers/v1/subscription_serializer").addSerializer();
exports.SubscriberSerializerV1 = require("./serializers/v1/subscriber_serializer").addSerializer();
exports.PubSubNewPostSerializerV1 = require("./serializers/v1/pubsub_new_post_serializer").addSerializer();
exports.PubSubUpdatePostSerializerV1 = require("./serializers/v1/pubsub_update_post_serializer").addSerializer();
exports.PubSubCommentSerializerV1 = require("./serializers/v1/pubsub_comment_serializer").addSerializer();
exports.PubSubLikeSerializerV1 = require("./serializers/v1/pubsub_like_serializer").addSerializer();
exports.FeedInfoSerializerV1 = require("./serializers/v1/feedinfo_serializer").addSerializer();
exports.AttachmentSerializerV1 = require("./serializers/v1/attachment_serializer").addSerializer();
exports.PostSerializerV1 = require('./serializers/v1/post_serializer').addSerializer(exports.Post);
exports.TimelineSerializerV1 = require("./serializers/v1/timeline_serializer").addSerializer();

exports.AdminSerializerV2 = require("./serializers/v2/admin_serializer").addSerializer();
exports.UserSerializerV2 = require('./serializers/v2/user_serializer').addSerializer(exports.User);
exports.CommentSerializerV2 = require("./serializers/v2/comment_serializer").addSerializer();
exports.SubscriptionSerializerV2 = require("./serializers/v2/subscription_serializer").addSerializer();
exports.SubscriberSerializerV2 = require("./serializers/v2/subscriber_serializer").addSerializer();
exports.PubSubNewPostSerializerV2 = require("./serializers/v2/pubsub_new_post_serializer").addSerializer();
exports.PubSubUpdatePostSerializerV2 = require("./serializers/v2/pubsub_update_post_serializer").addSerializer();
exports.PubSubCommentSerializerV2 = require("./serializers/v2/pubsub_comment_serializer").addSerializer();
exports.PubSubLikeSerializerV2 = require("./serializers/v2/pubsub_like_serializer").addSerializer();
exports.FeedInfoSerializerV2 = require("./serializers/v2/feedinfo_serializer").addSerializer();
exports.AttachmentSerializerV2 = require("./serializers/v2/attachment_serializer").addSerializer();
exports.PostSerializerV2 = require('./serializers/v2/post_serializer').addSerializer(exports.Post);
exports.TimelineSerializerV2 = require("./serializers/v2/timeline_serializer").addSerializer();
