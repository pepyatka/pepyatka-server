var ElasticSearchClient = require('elasticsearchclient')
  , db = require('../db').connect()
  , configLocal = require('../conf/envLocal.js')
  , async = require('async')

var elasticSearchClient = new ElasticSearchClient(configLocal.getElasticSearchConfig());

exports.elasticSearchClient = elasticSearchClient;

var getPostTimestamp = function(post, callback) {
  db.zscore('timeline:' + post.timelineId + ':posts', post.id, function(err, timestamp) {
    callback(timestamp);
  });
};

var replaceHashTagsToEqualWord = function(post) {
  post.body = post.body.replace(/#/g, configLocal.getWordWhichEqualHashTag())
  async.forEach(post.comments, function(comment, callback) {
    comment.body = comment.body.replace(/#/g, configLocal.getWordWhichEqualHashTag())
  })

  return post
}

var replaceToHashTagFromEqualWord = function(post) {
  post.body = post.body.replace(new RegExp(configLocal.getWordWhichEqualHashTag(), 'g'), '#')
  async.forEach(post.comments, function(comment, callback) {
    comment.body = comment.body.replace(new RegExp(configLocal.getWordWhichEqualHashTag(), 'g'), '#')
  })

  return post
}

exports.indexElement = function(index, type, element) {
  var getIndexerName = function(index, type){
    return index + '_' + type + '_' + 'index';
  };

  var createIndex = {
    pepyatka_post_index : function(post) {
      getPostTimestamp(post, function(timestamp) {
        post.timestamp = timestamp;
        elasticSearchClient.index('pepyatka', 'post', replaceHashTagsToEqualWord(post), post.id)
          .on('data', function(data) {
            console.log(data)
          })
          .on('error', function(error){
            console.log(error)
          })
          .exec();
      });
    }
  }

  createIndex[getIndexerName(index, type)](element);
};

exports.updateElement = function(index, type, element) {
  var getUpdaterName = function(index, type){
    return index + '_' + type + '_' + 'update';
  };

  var updateIndex = {
    pepyatka_post_update : function(post) {
      getPostTimestamp(post, function(timestamp) {
        post.timestamp = timestamp;
        elasticSearchClient.update("pepyatka", "post", post.id, replaceHashTagsToEqualWord(post))
          .on('data', function(data) {
            console.log(JSON.parse(data));
          })
          .on('done', function() {
            //always returns 0 right now
          })
          .on('error', function(error) {
            console.log(error)
          })
          .exec();
      });
    }
  }

  updateIndex[getUpdaterName(index, type)](element);
};

exports.parse = function(elasticSearchData) {
  var getParserName = function(index, type) {
    return index + '_' + type + '_' + 'parse';
  };

  var parser = {
    pepyatka_post_parse : function(elasticSearchDataItem) {
      var post = {
        id: elasticSearchDataItem._source.id,
        createdAt: elasticSearchDataItem._source.createdAt,
        updatedAt: elasticSearchDataItem._source.updatedAt,
        body: elasticSearchDataItem._source.body,
        createdBy: elasticSearchDataItem._source.createdBy,
        comments: elasticSearchDataItem._source.comments,
        attachments: elasticSearchDataItem._source.attachments,
        likes: elasticSearchDataItem._source.likes,
        timelineId: elasticSearchDataItem._source.timelineId
      }

      return replaceToHashTagFromEqualWord(post)
    }
  };

  var resultArray = [];

  if (elasticSearchData && elasticSearchData.hits)
    elasticSearchData.hits.hits.forEach(function(entry) {
      resultArray.push(parser[getParserName(entry._index, entry._type)](entry));
    });

  return resultArray;
};
