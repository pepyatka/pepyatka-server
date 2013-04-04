var environment = require('./../environment.js')
  , publicTimelineSynchronizer = require('./../services/public-timeline-synchronizer.js');

environment.init(function(err, res) {
  publicTimelineSynchronizer.startSynchronization();
})
