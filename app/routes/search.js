var searchClient = require('../../elastic-search/elastic-search-client.js');

exports.addRoutes = function(app) {
    app.get('/search', function(req, res) {
        startSearching(req.query, function(json){
            res.jsonp(json);
        })
    })
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

