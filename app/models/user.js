var uuid = require('node-uuid')

exports.add_model = function(db) {
  function User(params) {
    this.username = params.username
    this.id = params.id
  }

  // TODO: create Anonymous model which is inherited from User
  User.anon = function(callback) {
    // init anonymous user if it doesn't exist yet
    var user_id = uuid.v4();

    var returnAnon = function() {
      db.get('username:anonymous:uid', function(err, res) {
        return callback(res);
      })
    }

    db.setnx('username:anonymous:uid', user_id, function(err, res) {
      if (res == 1) {
        db.hsetnx('user:' + user_id, 'username', 'anonymous', function(err, res) {
          returnAnon()
        })
      } else {
        returnAnon()
      }
    })
  }

  User.find = function(user_id, callback) {
    db.hgetall('user:' + user_id, function(err, attrs) {
      // Seems it's either deleted user or broken session. Redirect to
      // auth method
      if (attrs === null) attrs = {}

      attrs.id = user_id
      return callback(new User(attrs))
    })
  },

  User.auth = function(username, password) {
    // TODO: not implemented yet
  }

  User.prototype = {
    posts: function() {
      Timeline.find(this.id)
    }
  }
  
  return User;
}
