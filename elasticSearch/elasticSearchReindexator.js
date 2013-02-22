var models = require('./../app/models')
  , redis = require('redis')
  , db = require('../db').connect()
  , elasticSearch = require('./elasticSearchClient.js')

var startCheckingPosts = function(){
  db.keys('post:*', function(err, postsIdKeys){
    postsIdKeys.forEach(function(postsIdKey){
      var postId;
      postsIdKey = postsIdKey.replace(/post:/, '');
      if (!/:(\w)+/.test(postsIdKey)){
        postId = postsIdKey;
      }

      models.Post.findById(postId, function(err, post) {
        if (post) {
          post.toJSON({ select: ['id', 'body', 'createdBy', 'attachments', 'comments', 'createdAt', 'updatedAt', 'likes'],
            createdBy: { select: ['id', 'username'] },
            comments: { select: ['id', 'body', 'createdBy'],
              createdBy: { select: ['id', 'username'] }},
            likes: { select: ['id', 'username']}
          },
          function(err, json) {
            checkIndex({
              index: 'pepyatka',
              type: 'post',
              element: json
            });
          });
        }
      })
    });
  });
}

var startCheckingIndexes = function(){
  startCheckingPosts();
}

var checkIndex = function(dbObject){
  var qryObj = {
    "query" : {
        "term" : {"_id" : dbObject.element.id}
    }
  };

  elasticSearch.elasticSearchClient.search(dbObject.index, dbObject.type, qryObj)
    .on('data', function(data) {
      var json =  JSON.parse(data);
      var result = elasticSearch.parse(json)[0];
      if (result){
        if (!isEqualElements(dbObject.element, result)){
          elasticSearch.updateElement(dbObject.index, dbObject.type, dbObject.element);
        }
      } else {
        elasticSearch.indexElement(dbObject.index, dbObject.type, dbObject.element);
      }
    })
    .on('done', function(){
      //always returns 0 right now
    })
    .on('error', function(error){
      console.log(error)
    })
    .exec();
}

var isEqualArrays = function(firstArray, secondArray){
  var isEqual;
  if (Array.isArray(firstArray) && Array.isArray(secondArray)){
    isEqual = firstArray.length == secondArray.length;
    if (isEqual){
      var i = 0;
      firstArray.forEach(function(element){
        if (isEqual){
          isEqual = isEqualElements(element, secondArray[i++]);
        }
      })
    }
  }

  return isEqual;
};

var isEqualObjects = function(firstObject, secondObject){
  var isEqual;
  var checkedProperties = [];
  if (typeof firstObject == 'object' && typeof secondObject == 'object'){
    isEqual = true;
    for(var property in firstObject){
      if (isEqual){
        checkedProperties.push(property);
        isEqual = isEqualElements(firstObject[property], secondObject[property]);
      }
    }
    if (isEqual){
      for(var property in secondObject){
        if (isEqual){
          if (checkedProperties.indexOf(property) == -1){
            isEqual = false;
          }
        }
      }
    }
  }

  return isEqual;
}

var isEqualElements = function(firstElement, secondElement){
  var isEqual;
  if (typeof firstElement == 'object' && typeof secondElement == 'object'){
    if (Array.isArray(firstElement) && Array.isArray(secondElement)){
      isEqual = isEqualArrays(firstElement, secondElement);
    } else{
      if (Array.isArray(firstElement) || Array.isArray(secondElement)){
        isEqual = false;
      } else{
        isEqual = isEqualObjects(firstElement, secondElement);
      }
    }
  } else{
    isEqual = firstElement == secondElement;
  }

  return isEqual;
}

exports.startInspection = function(){
  startCheckingIndexes();
}