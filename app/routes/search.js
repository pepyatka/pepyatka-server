var searchClient = require('../../elastic-search/elastic-search-client.js')
  , async = require('async')
  , configLocal = require('../../conf/envLocal.js')

var indicators = ['intitle', 'incomments', 'from'];

// TODO: refactor me to Search model

exports.addRoutes = function(app) {
  app.get('/v1/search/:searchQuery', function(req, res) {
    var pageSize = 25;
    var pageStart = req.query && req.query.start || 0;
    var searchQuery = req.params.searchQuery.replace(/%23/g, '#')
    searchQuery = searchQuery.replace(/#/g, configLocal.getWordWhichEqualHashTag())
    var parsedQuery = parseQuery(searchQuery);

    if (parsedQuery) {
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

var replaceWhitespacesTOAND = function(searchQuery) {
  searchQuery = searchQuery.replace(/ +(?!AND)(?!OR)/g, ' AND ');
  searchQuery = searchQuery.replace(/ AND AND /g, ' AND ');
  searchQuery = searchQuery.replace(/ OR AND /g, ' OR ');

  return searchQuery;
}

var createAndSection = function(andQuery) {
  var condition;
  andQuery = andQuery.toLowerCase();

  if (isSimpleQuery(andQuery)) {
    condition = {
      "bool" : {
        "should" : [
            { "wildcard" : { "body" : '*'+andQuery+'*' } }
          , { "wildcard" : { "comments.body" : '*'+andQuery+'*' } }
        ],
        "minimum_number_should_match" : 1
      }
    }
  } else {
    var keyValue = andQuery.split(':');
    var key = keyValue[0];
    var value = keyValue[1];

    if (key && value) {
      switch (key) {
      case 'intitle':
        condition = { "wildcard" : { "body" : '*' + value + '*' } }
        break
      case 'incomments':
        condition = { "wildcard" : { "comments.body" : '*' + value + '*' } }
        break
      case 'from':
        condition = { "term" : { "createdBy.username" : value } }
        break
      }
    }
  }

  return condition;
}

var createOrSection = function(orQuery) {
  var splitedByANDQueries = orQuery.split(' AND ');
  var conditions = [];
  var boolQuery;

  async.forEach(splitedByANDQueries, function(splitedByANDQuery, callback) {
    if (splitedByANDQuery) {
      var andSection = createAndSection(splitedByANDQuery);
      if (andSection)
        conditions.push(andSection);
    }
    callback(null);
  })

  if (conditions.length > 0) {
    boolQuery = {
      "bool" : {
        "should" : conditions,
        "minimum_number_should_match" : conditions.length
      }
    };
  }

  return boolQuery;
}

var parseQuery = function(searchQuery) {
  searchQuery = replaceWhitespacesTOAND(searchQuery);
  var splitedByORQueries = searchQuery.split(' OR ');
  var conditions = [];
  var boolQuery;

  async.forEach(splitedByORQueries, function(splitedByORQuery, callback) {
    if (splitedByORQuery) {
      var orSection = createOrSection(splitedByORQuery);
      if (orSection)
        conditions.push(orSection);
    }
    callback(null);
  })

  if (conditions.length > 0) {
    boolQuery = {
      "bool" : {
        "should": conditions,
        "minimum_number_should_match": 1
      }
    };
  }

  return boolQuery;
}

//It means that we have simple text without indicators
var isSimpleQuery = function(searchQuery) {
  var isSimple = true;
  indicators.forEach(function(indicator) {
    if (isSimple) {
      var regExp = new RegExp('^' + indicator + ':' + '.')
      isSimple = !regExp.test(searchQuery);
    }
  })

  return isSimple;
}

var startSearching = function(query, callback) {
  searchClient.elasticSearchClient.search(query.index, query.type, query.queryObject)
    .on('data', function(data) {
      var json =  JSON.parse(data);
      callback({posts: searchClient.parse(json)});
    })
    .on('done', function() {
      //always returns 0 right now
    })
    .on('error', function(error) {
      console.log(error)
    })
    .exec();
};
