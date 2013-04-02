var models = require('./../app/models')
  , db = require('../db').connect()
  , async = require('async')

var resultTagInfo = {}

var startCheckingTags = function() {
  db.keys('post:*', function(err, postsIdKeys) {
    async.forEach(postsIdKeys
      ,function(postsIdKey, done) {
        var postId;
        postsIdKey = postsIdKey.replace(/post:/, '');
        if (!/:(\w)+/.test(postsIdKey)) {
          postId = postsIdKey;
          checkPost(postId, done)
        } else {
          done(null)
        }
      }
      , function(err) {
        updateTags(function(err) {
          console.log('Tags were updated')
        })
      });
  });
}

var updateTags = function(callback) {
  async.parallel([
    function(done) {
      updateExistTags(done)
    },
    function(done) {
      removeNotExistTags(done)
    }],
    function(err) {
      callback(err)
    })
}

var updateExistTags = function(callback) {
  var tags = []
  for (var tag in resultTagInfo) {
    tags.push({ tagName: tag, count: resultTagInfo[tag] })
  }

  async.forEach(tags, function(tag, done) {
      db.zadd('tags:everyone', tag.count, tag.tagName, function(err, res) {
        done(err)
      })
    },
    function(err) {
      callback(err)
    })
}

var removeNotExistTags = function(callback) {
  db.zrevrange('tags:everyone', 0, -1, function(err, res) {
    async.forEach(res, function(oldTag, done) {
      if (resultTagInfo[oldTag]) return done(null)

      db.zrem('tags:everyone', oldTag, function(err, res) {
        done(err)
      })
    }, function(err) {
      callback(err)
    })
  })
}

var checkPost = function(postId, callback) {
  models.Post.findById(postId, function(err, post) {
    if (post) {
      post.toJSON({ select: ['id', 'body', 'comments'],
          comments: { select: ['id', 'body']}
        },
        function(err, json) {
          async.parallel([
            function(done) {
              models.Tag.extract(json.body, function(err, res) {
                addTagsInfoToResult(res, done)
              })
            },
            function(done) {
              checkComments(json.comments, done)
            }],
            function(err) {
              callback(err)
            })
        });
    }
  })
}

var checkComments = function(comments, callback) {
  async.forEach(comments, function(comment, callback) {
      models.Tag.extract(comment.body, function(err, res) {
        addTagsInfoToResult(res, callback)
      })
    },
    function(err) {
      callback(err)
    })
}

var addTagsInfoToResult = function(tagsInfo, callback) {
  for (var tag in tagsInfo) {
    if (resultTagInfo[tag]) {
      resultTagInfo[tag] = resultTagInfo[tag] + tagsInfo[tag]
      continue
    }

    resultTagInfo[tag] = tagsInfo[tag]
  }

  callback(null)
}

exports.startSynchronization = function() {
  startCheckingTags();
}
