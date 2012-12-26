exports.add_model = function(db) {
  function User(params) {
  }

  User.anon = function(callback) {
    // init anonymous user if it doesn't exist yet
    db.setnx('username:anonymous:uid', '9b62aaf3-53c5-4850-a085-4769cb0e9c94')
    db.hsetnx('user:9b62aaf3-53c5-4850-a085-4769cb0e9c94', 'username', 'anonymous')
        
    db.get('username:anonymous:uid', function(err, res) {
      return callback(res);
    })
  }

  User.find = function(user_id, callback) {
    db.hgetall('user:' + user_id, function(err, res) {
      return callback(res)
    })
  },

  User.auth = function(username, password) {
  }

  User.prototype = {
  }
  
  return User;
}
