var models = require('../models'),
    elasticSearch = require('../../elasticSearch/elasticSearchClient.js');

exports.addRoutes = function(app) {
    app.get('/search', function(req, res) {
        startSearching(req.query, function(json){
            res.jsonp(json);
        })
    })
}

var startSearching = function(query, callback){
    var elasticSearchClient = elasticSearch.elasticSearchClient;
    elasticSearchClient.search(query.index, query.type, query.queryObject)
    .on('data', function(data) {
        var json =  JSON.parse(data);
        console.log(json);
        callback(parser.parse(json));
    })
    .on('done', function(){
        //always returns 0 right now
    })
    .on('error', function(error){
        console.log(error)
    })
    .exec();
};

var parser = {
    parse : function(elasticSearchData){
        var getParserName = function(index, type){
            return index + '_' + type + '_' + 'parse';
        };

        var resultArray = [];
        elasticSearchData.hits.hits.forEach(function(entry){
            resultArray.push(parser[getParserName(entry._index, entry._type)](entry));
        });

        return resultArray;
    },

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