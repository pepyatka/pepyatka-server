var express = require('express')
  , app = express()
  , environment = require('./../environment.js')
  , statisticsSynchronizer = require('./../services/statistics-synchronizer.js');

environment.init(function(err, res) {
  statisticsSynchronizer.startSynchronization();
})
