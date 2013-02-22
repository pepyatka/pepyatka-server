var ElasticSearchClient = require('elasticsearchclient')
  , db = require('../db').connect()

var serverOptions = {
    host: 'localhost',
    port: 9200
};

var elasticSearchClient = new ElasticSearchClient(serverOptions);

exports.elasticSearchClient = elasticSearchClient;

var getPostTimestamp = function(post, callback){
  db.zscore('timeline:' + post.timelineId + ':posts', post.id, function(err, timestamp){
    callback(timestamp);
  });
};

exports.indexElement = function(index, type, element){
  var getIndexerName = function(index, type){
    return index + '_' + type + '_' + 'index';
  };

  var createIndex = {
    pepyatka_post_index : function(post){
      getPostTimestamp(post, function(timestamp){
        elasticSearchClient.index('pepyatka', 'post',
          {
            id: post.id,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            body: post.body,
            createdBy: post.createdBy,
            comments: post.comments,
            attachments: post.attachments,
            likes: post.likes,
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
    }
  }

    createIndex[getIndexerName(index, type)](element);
};

exports.updateElement = function(index, type, element){
  var getUpdaterName = function(index, type){
    return index + '_' + type + '_' + 'update';
  };

  var updateIndex = {
    pepyatka_post_update : function(post){
      getPostTimestamp(post, function(timestamp){
        post.timestamp = timestamp;
        elasticSearchClient.update("pepyatka", "post", post)
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
    }
  }

  updateIndex[getUpdaterName(index, type)](element);
};

exports.parse = function(elasticSearchData){
  var getParserName = function(index, type){
    return index + '_' + type + '_' + 'parse';
  };

  var parser = {
    pepyatka_post_parse : function(elasticSearchDataItem){
      return {
        id: elasticSearchDataItem._id,
        createdAt: elasticSearchDataItem._source.createdAt,
        updatedAt: elasticSearchDataItem._source.updatedAt,
        body: elasticSearchDataItem._source.body,
        createdBy: elasticSearchDataItem._source.createdBy,
        comments: elasticSearchDataItem._source.comments,
        attachments: elasticSearchDataItem._source.attachments,
        likes: elasticSearchDataItem._source.likes
      };
    }
  };

  var resultArray = [];

  if (elasticSearchData && elasticSearchData.hits)
    elasticSearchData.hits.hits.forEach(function(entry){
      resultArray.push(parser[getParserName(entry._index, entry._type)](entry));
    });

  return resultArray;
};