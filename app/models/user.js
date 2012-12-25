exports.add_model = function(db) {
  var initAnonUser = function() {
    db.setnx('username:anonymous:uid', '9b62aaf3-53c5-4850-a085-4769cb0e9c94')
    db.hsetnx('uid:9b62aaf3-53c5-4850-a085-4769cb0e9c94', 'username', 'anonymous')
  }

  return {
    anon: function(callback) {
      initAnonUser();
      
      db.get('username:anonymous:uid', function(err, res) {
        return callback(res);
      })
    },

    find: function(user_id, callback) {
      db.hgetall('uid:' + user_id, function(err, res) {
        return callback(res)
      })
    }
  };
}
