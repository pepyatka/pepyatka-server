var environment = require('./../environment.js')
  , tagsSynchronizer = require('./../services/tags-synchronizer.js');

environment.init(function(err, res) {
  tagsSynchronizer.startSynchronization();
})
