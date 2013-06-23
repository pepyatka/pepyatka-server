var models = require('./../app/models')
  , db = require('../db').connect()
  , async = require('async')

var updateUserInfo = function() {
  var userSerializer = {
    select: ['id', 'username', 'type', 'info'],
    info: {
      select: ['screenName', 'email', 'receiveEmails']
    }
  }

  db.keys('user:*', function(err, usersIdKeys) {
    async.forEach(usersIdKeys,
                  function(usersIdKey, callback) {
                    var userId;
                    usersIdKey = usersIdKey.replace(/user:/, '');
                    if (/:(\w)+/.test(usersIdKey))
                      return callback(null)

                    userId = usersIdKey;
                    models.User.findById(userId, function(err, user) {
                      if (!user)
                        return callback(null)

                      if (user.info || user.info.screenName)
                        return callback(null)

                      var params = {
                        screenName: user.username
                      }
                      user.update(params, function(err, user) {
                        if (err)
                          return callback(err)

                        console.log("User " + user.username + " updated.")
                        callback(err)
                      })
                    })
                  },
                  function(err) {
                    console.log('User info update completed.');

                    if (err)
                      console.log("Error occured.")
                  })
  })

  db.get('username:anonymous:uid', function(err, uid) {
    db.hset('user:' + uid + ':info', 'screenName', 'anonymous', function(err, res) {
      console.log("Updated anonymous user.")
    })
  })
}

exports.updateUserInfo = function() {
  updateUserInfo();
}
