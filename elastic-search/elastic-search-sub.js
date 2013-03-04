var models = require('./../app/models')
  , redis = require('redis')
  , searchClient = require('./elastic-search-client.js');

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
                  models.Timeline.findById(data.timelineId, {}, function(err, timeline) {
                    // TODO: workaround to index just one post
                    if (post && timeline && timeline.name == 'Posts') {
                      post.toJSON({ select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes', 'timelineId'],
                          createdBy: { select: ['id', 'username'] },
                          comments: { select: ['id', 'body', 'createdBy'],
                            createdBy: { select: ['id', 'username'] } },
                          likes: { select: ['id', 'username']}
                        },
                        function(err, json) {
                          searchClient.indexElement('pepyatka', 'post', json);
                        })
                    }
                  })
                });
                break;

            case 'newComment':
                var data = JSON.parse(msg)
                models.Post.findById(data.postId, function(err, post) {
                  if (post) {
                    post.toJSON({ select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes', 'timelineId'],
                        createdBy: { select: ['id', 'username'] },
                        comments: { select: ['id', 'body', 'createdBy'],
                          createdBy: { select: ['id', 'username'] } },
                        likes: { select: ['id', 'username']}
                      },
                      function(err, json) {
                        searchClient.updateElement('pepyatka', 'post', json);
                      })
                  }
                })
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
