var models = require('../models')

exports.addModel = function(db) {
  function FeedFactory() {
  }

  FeedFactory.findById = function(feedId, callback) {
    db.hget('user:' + feedId, 'type', function(err, type) {
      if (type === null)
        return callback(1, null)

      switch(type) {
        case 'group' : {
          models.Group.findById(feedId, function(err, group) {
            callback(err, group)
          })
          break
        }
        case 'user' : {
          models.User.findById(feedId, function(err, user) {
            callback(err, user)
          })
          break
        }
      }
    })
  }

  FeedFactory.findByName = function(feedName, callback) {
    db.get('username:' + feedName + ':uid', function(err, feedId) {
      if (err)
        return callback(err, null)

      FeedFactory.findById(feedId, function(err, feed) {
        callback(err, feed)
      })
    })
  }

  return FeedFactory;
}
