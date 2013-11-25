var env = require("../../environment")
  , db = require('../../db').connect()
  , models = require("../../app/models")
  , async = require("async");

env.init(function(_,__,db) {
  db.keys('attachment:*', function(err, attachmentIds) {
    async.map(attachmentIds, function(attachmentId, done) {
      db.hgetall(attachmentId, function(err, image) {
        if (image.ext === 'jpeg' || image.ext === 'png' || image.ext === 'gif' || 
            image.ext === 'jpg') {
          db.hset(attachmentId, 'mediaType', 'image', function(err, res) {
            console.log('- updated attachment: ' + attachmentId)
            done(err)
          })
        } else {
          done(null)
        }
      })
    }, function(err) {
      console.log('Done.')
    })
  });
});
