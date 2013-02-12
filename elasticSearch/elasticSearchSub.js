var models = require('./../app/models')
    , redis = require('redis')
    , db = require('../db').connect()
    , elasticSearch = require('./elasticSearchClient.js')
    , core_ext = require('./../core_ext.js');

var getPostTimestamp = function(post, callback){
    db.zscore('timeline:' + post.timelineId + ':posts', post.id, function(err, timestamp){
        callback(timestamp);
    });
};

var indexPost = function(post){
    var elasticSearchClient = elasticSearch.elasticSearchClient;
    getPostTimestamp(post, function(timestamp){
        post.toJSON({ select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes'],
                        createdBy: { select: ['id', 'username'] },
                        comments: { select: ['id', 'body', 'createdBy'],
                            createdBy: { select: ['id', 'username'] }},
                        likes: { select: ['id', 'username']}
                    },
                    function(err, json) {
                        elasticSearchClient.index('pepyatka', 'post',
                        {
                            id: json.id,
                            createdAt: json.createdAt,
                            updatedAt: json.updatedAt,
                            body: json.body,
                            createdBy: json.createdBy,
                            comments: json.comments,
                            attachments: json.attachments,
                            likes: json.likes,
                            timestamp: timestamp
                        })
                        .on('data', function(data) {
                            console.log(data)
                        })
                        .on('error', function(error){
                            console.log(error)
                        })
                        .exec();
                    });
    });
};

var updatePost = function(post){
    var elasticSearchClient = elasticSearch.elasticSearchClient;
    getPostTimestamp(post, function(timestamp){
        post.toJSON({ select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes'],
                        createdBy: { select: ['id', 'username'] },
                        comments: { select: ['id', 'body', 'createdBy'],
                            createdBy: { select: ['id', 'username'] }},
                        likes: { select: ['id', 'username']}
                    },
                    function(err, json) {
                        json.timestamp = timestamp;
                        elasticSearchClient.update("pepyatka", "post", json)
                        .on('data', function(data) {
                            console.log(JSON.parse(data));
                        })
                        .on('done', function(){
                            //always returns 0 right now
                        })
                        .on('error', function(error){
                            console.log(error)
                        })
                        .exec();
                    });
    });
};

exports.listen = function() {
    var sub = redis.createClient();

    sub.subscribe('newPost', 'destroyPost',
        'newComment', 'destroyComment',
        'newLike', 'removeLike' )

    sub.on('message', function(channel, msg) {
        switch(channel) {
//            case 'destroyPost':
//                var data = JSON.parse(msg)
//                var event = { postId: data.postId }
//
//                break
//
            case 'newPost':
                var data = JSON.parse(msg);
                models.Post.findById(data.postId, function(err, post) {
                    if (post) {
                        indexPost(post);
                    }
                });
                break;

            case 'newComment':
                var data = JSON.parse(msg)

                models.Post.findById(data.postId, function(err, post) {
                    if (post) {
                        updatePost(post);
                    }
                });
                break;

//            case 'newLike':
//                var data = JSON.parse(msg)
//
//                models.User.findById(data.userId, function(err, user) {
//                    if (user) {
//                        user.toJSON(function(err, json) {
//
//                        });
//                break;
//
//            case 'removeLike':
//                var data = JSON.parse(msg)
//                var event = { userId: data.userId, postId: data.postId }
//
//                break
        }
    })
}
