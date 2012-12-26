exports.add_model = function(db) {
  function User(params) {
    this.username = params.username
    this.id = params.id
  }

  // TODO: create Anonymous model which is inherited from User
  User.anon = function(callback) {
    // init anonymous user if it doesn't exist yet
    db.setnx('username:anonymous:uid', '9b62aaf3-53c5-4850-a085-4769cb0e9c94')
    db.hsetnx('user:9b62aaf3-53c5-4850-a085-4769cb0e9c94', 'username', 'anonymous')
        
    db.get('username:anonymous:uid', function(err, res) {
      return callback(res);
    })
  }

  User.find = function(user_id, callback) {
    db.hgetall('user:' + user_id, function(err, attrs) {
      attrs.id = user_id
      return callback(new User(attrs))
    })
  },

  User.auth = function(username, password) {
  }

  User.prototype = {
    posts: function() {
      db.zrevrange('timeline:' + this.id, 0, -1)
    }
  }
  
  return User;
}
