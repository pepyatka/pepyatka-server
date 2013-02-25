var searchClient = require('../../elastic-search/elastic-search-client.js')
    , async = require('async')

var indicators = ['intitle', 'incomments', 'from'];

exports.addRoutes = function(app) {
  app.get('/search/:searchQuery', function(req, res) {
    var pageSize = 25;
    var pageStart = req.query && req.query.start || 0;

//    var searchQuery = req.params.searchQuery.replace(/#/g, '\\#')
    var searchQuery = req.params.searchQuery.replace(/#/g, '') // TODO Now elasticSearch can't search with '#' char in query
    var parsedQuery = parseQuery(searchQuery);

    if (parsedQuery){
      var query = {
        index: 'pepyatka',
        type: 'post',
        queryObject: {
          "sort" : [
            {"timestamp" : {"order" : "desc"}}
          ],
          "size" : pageSize,
          "from" : pageStart,
          "query" : parsedQuery
        }
      };

      startSearching(query, function(json){
        res.jsonp(json);
      })
    }
  })
}

var convertToProgrammersString = function(searchQuery){
  searchQuery = searchQuery.replace(/ +AND +/g, '&&');
  searchQuery = searchQuery.replace(/ +OR +/g, '||');
  searchQuery = searchQuery.replace(/ +/g, '&&');

  return searchQuery;
}

var createAndSection = function(andQuery){
  var condition;
  if (isSimpleQuery(andQuery)){
    condition = {
      "bool" : {"should" : [
        {"wildcard" : { "body" : '*'+andQuery+'*'}},
        {"wildcard" : { "comments.body" : '*'+andQuery+'*'}}],
        "minimum_number_should_match" : 1}}
  } else {
    var keyValue = andQuery.split(':');
    var key = keyValue[0];
    var value = keyValue[1];
    if (key && value){

      switch (key){
        case 'intitle':{
          condition = {"wildcard" : { "body" : '*'+value+'*'}};
          break;
        }
        case 'incomments':{
          condition = {"wildcard" : { "comments.body" : '*'+value+'*'}};
          break;
        }
        case 'from':{
          condition = {"term" : { "createdBy.username" : value }};
          break;
        }
      }
    }
  }

  return condition;
}

var createOrSection = function(orQuery){
  var splitedByANDQueries = orQuery.split('&&');
  var conditions = [];
  var boolQuery;
  async.forEach(splitedByANDQueries, function(splitedByANDQuery, callback){
    if (splitedByANDQuery){
      var andSection = createAndSection(splitedByANDQuery);
      if (andSection)
      {
        conditions.push(andSection);
      }
    }
    callback(null);
  })

  if (conditions.length > 0){
    boolQuery = {"bool" : {"should" : conditions, "minimum_number_should_match" : conditions.length}};
  }

  return boolQuery;
}

var parseQuery = function(searchQuery){
  searchQuery = convertToProgrammersString(searchQuery);
  var splitedByORQueries = searchQuery.split('||');
  var conditions = [];
  var boolQuery;
  async.forEach(splitedByORQueries, function(splitedByORQuery, callback){
      if (splitedByORQuery){
        var orSection = createOrSection(splitedByORQuery);
        if (orSection)
        {
          conditions.push(orSection);
        }
      }
      callback(null);
    })

  if (conditions.length > 0){
    boolQuery = {"bool" : {"should": conditions, "minimum_number_should_match": 1}};
  }

  return boolQuery;
}

//It means that we have simple text without indicators
var isSimpleQuery = function(searchQuery){
  var isSimple = true;
  indicators.forEach(function(indicator){
    if (isSimple){
      var regExp = new RegExp('^' + indicator + ':' + '.')
      isSimple = !regExp.test(searchQuery);
    }
  })

  return isSimple;
}

var startSearching = function(query, callback){
  searchClient.elasticSearchClient.search(query.index, query.type, query.queryObject)
  .on('data', function(data) {
      var json =  JSON.parse(data);
      callback({posts: searchClient.parse(json)});
  })
  .on('done', function(){
      //always returns 0 right now
  })
  .on('error', function(error){
      console.log(error)
  })
  .exec();
};

