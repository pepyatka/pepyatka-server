var express = require('express')
  , app = express()
  , environment = require('./../environment.js')
  ,elasticSearchReindexator = require('./../elastic-search/elastic-search-reindexator.js');

environment.init(function(err, res) {
  elasticSearchReindexator.startInspection();
})