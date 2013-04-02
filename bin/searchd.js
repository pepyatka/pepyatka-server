var express = require('express')
  , app = express()
  , environment = require('./../environment.js')
  , elasticSearch = require('./../elastic-search/elastic-search-sub.js');

environment.init(function(err, res) {
  elasticSearch.listen();
})
