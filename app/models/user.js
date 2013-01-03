var uuid = require('node-uuid')

exports.add_model = function(db) {
  function User(params) {
    console.log('new User(' + params + ')')
    this.username = params.username
    this.id = params.id
  }

  // TODO: create Anonymous model which is inherited from User
  User.anon = function(callback) {
    console.log('User.anon()')
    // init anonymous user if it doesn't exist yet
    var user_id = uuid.v4();

    var returnAnon = function() {
      User.find_by_username('anonymous', function(user) {
        return callback(user.id);
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

  User.find_by_username = function(username, callback) {
    console.log('User.find_by_username("' + username + '")')
    db.get('username:' + username + ':uid', function (err, user_id) {
      User.find(user_id, function(user) { 
        return callback(user)
      })
    })  
  }

  User.find = function(user_id, callback) {
    console.log('User.find("' + user_id + '")')
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
  },

  User.prototype = {
    posts: function() {
      console.log('- user.posts()')
      Timeline.find(this.id)
    },

    toJSON: function(callback) {
      console.log('- user.toJSON()')
      return callback({
        id: this.id,
        username: this.username
      })
    }

  }
  
  return User;
}
