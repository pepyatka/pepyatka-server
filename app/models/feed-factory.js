var models = require('../models')

exports.addModel = function(db) {
  function FeedFactory() {
  }

  FeedFactory.destroy = function(feedId, callback) {
    db.hget('user:' + feedId, 'type', function(err, type) {
      switch(type) {
        case 'group' :
          models.Group.destroy(feedId, function(err) {
            callback(err)
          })
          break

        default :
          models.User.destroy(feedId, function(err) {
            callback(err)
          })
          break
      }
    })
  }

  FeedFactory.findById = function(feedId, callback) {
    db.hget('user:' + feedId, 'type', function(err, type) {

      switch(type) {
        case 'group' :
          models.Group.findById(feedId, function(err, group) {
            callback(err, group)
          })
          break

        default :
          models.User.findById(feedId, function(err, user) {
            callback(err, user)
          })
          break
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
