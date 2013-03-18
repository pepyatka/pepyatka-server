var models = require('./../app/models')
  , db = require('../db').connect()
  , elasticSearch = require('./elastic-search-client.js')
  , async = require('async')

var startCheckingPosts = function() {
  var startCheckingExistingPosts = function(callback) {
    db.keys('post:*', function(err, postsIdKeys) {
      async.forEach(postsIdKeys
        ,function(postsIdKey, callback) {
          var postId;
          postsIdKey = postsIdKey.replace(/post:/, '');
          if (!/:(\w)+/.test(postsIdKey)) {
            postId = postsIdKey;

            models.Post.findById(postId, function(err, post) {
              if (post) {
                post.toJSON({ select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes', 'timelineId'],
                    createdBy: { select: ['id', 'username'] },
                    comments: { select: ['id', 'body', 'createdBy'],
                      createdBy: { select: ['id', 'username'] } },
                    likes: { select: ['id', 'username']}
                  },
                  function(err, json) {
                    checkIndex({
                      index: 'pepyatka',
                      type: 'post',
                      element: json
                    }, function(err){
                      callback(err);
                    });
                  });
              }
            })
          } else {
            callback(null)
          }
        }
        , function(err) {
          callback()
        });
    });
  }

  // NOTE: THIS IS A WORKAROUND TILL WE PLUGIN A BETTER SOLUTION.
  // This method goes through all indexed posts and checks if it's
  // deleted or not. If it's it removes it from the index. Better
  // solution'd be to have a key in redis like posts:deleted with all
  // deleted posts. In this case owner might restore a post if he
  // wants (like FrF Undo).
  var startChekingDeletedPosts = function(callback) {
    var checkDeletedPosts = function(fromNumber) {
      var size = 25
      var queryObject = {
        "size" : size,
        "from" : fromNumber,
        "query" : {
          "wildcard" : { "id" : '?*' } //It doesn't work with '_id'
        }}

      elasticSearch.elasticSearchClient.search('pepyatka', 'post', queryObject)
        .on('data', function(data) {
          var json =  JSON.parse(data);
          var searchedElements = elasticSearch.parse(json)
          if(searchedElements.length == 0) callback()

          async.forEach(searchedElements, function(post, callback) {
              checkDbElement('pepyatka', 'post', post.id)
              callback()
            },
            function(err) {
              checkDeletedPosts(fromNumber + size)
            })
        })
        .on('done', function() {
        })
        .on('error', function(error) {
          console.log(error)
        })
        .exec();
    }

    checkDeletedPosts(0)
  }

  async.parallel([
      function(callback) {
        startCheckingExistingPosts(callback)
      },
      function(callback) {
        startChekingDeletedPosts(callback)
      }],
    function(err) {
      if(err) console.log(err)
      else console.log('Reindexation was complete');//TODO Fix this. The message is displayed before the reindexation is complete
  })
}

var startCheckingIndexes = function() {
  startCheckingPosts();
}

var checkDbElement = function(index, type, elementId) {
  switch (type) {
    case 'post':
      models.Post.findById(elementId, function(err, post) {
        if (post) return

        elasticSearch.deleteElement(index, type, elementId)
      })
      break
  }
}

var checkIndex = function(dbObject, callback) {
  var qryObj = {
    "query" : {
        "term" : { "_id" : dbObject.element.id } //It doesn't work with 'id'
    }
  };

  elasticSearch.elasticSearchClient.search(dbObject.index, dbObject.type, qryObj)
    .on('data', function(data) {
      var json =  JSON.parse(data);
      var result = elasticSearch.parse(json)[0];
      if (result){
        if (!isEqualElements(dbObject.element, result)) {
          elasticSearch.updateElement(dbObject.index, dbObject.type, dbObject.element);
        }
      } else {
          elasticSearch.indexElement(dbObject.index, dbObject.type, dbObject.element);
      }
    })
    .on('done', function() {
      callback(null)
    })
    .on('error', function(error) {
      console.log(error)
      callback(error)
    })
    .exec();
}

var isEqualElements = function(firstElement, secondElement) {
  var isEqualArrays = function(firstArray, secondArray) {
    var isEqual;
    if (Array.isArray(firstArray) && Array.isArray(secondArray)) {
      isEqual = firstArray.length == secondArray.length;
      if (isEqual) {
        var i = 0;
        firstArray.forEach(function(element) {
          if (isEqual){
            isEqual = isEqualElements(element, secondArray[i++]);
          }
        })
      }
    }

    return isEqual;
  };

  var isEqualObjects = function(firstObject, secondObject) {
    var isEqual;
    var checkedProperties = [];
    if (typeof firstObject == 'object' && typeof secondObject == 'object') {
      isEqual = true;
      for(var property in firstObject) {
        if (isEqual) {
          checkedProperties.push(property);
          isEqual = isEqualElements(firstObject[property], secondObject[property]);
        }
      }
      if (isEqual) {
        for(var property in secondObject) {
          if (isEqual) {
            if (checkedProperties.indexOf(property) == -1) {
              isEqual = false;
            }
          }
        }
      }
    }

    return isEqual;
  }

  var isEqual;
  if (typeof firstElement == 'object' && typeof secondElement == 'object') {
    if (Array.isArray(firstElement) && Array.isArray(secondElement)) {
      isEqual = isEqualArrays(firstElement, secondElement);
    } else{
      if (Array.isArray(firstElement) || Array.isArray(secondElement)) {
        isEqual = false;
      } else {
        isEqual = isEqualObjects(firstElement, secondElement);
      }
    }
  } else {
    isEqual = firstElement == secondElement;
  }

  return isEqual;
}

exports.startInspection = function() {
  startCheckingIndexes();
}
