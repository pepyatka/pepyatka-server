exports.add_model = function(db) {
  var initAnonUser = function() {
    db.set('username:anonymous:uid', '9b62aaf3-53c5-4850-a085-4769cb0e9c94')
    db.hset('uid:9b62aaf3-53c5-4850-a085-4769cb0e9c94', 'username', 'anonymous')
  }

  return {
    anon: function() {
      db.exists('username:anonymous:uid', function(err, res) {
        if (res === 0) { initAnonUser() };
      })
      
      db.get('username:anonymous:uid', function(err, res) {
        return res;
      })
    }
  };
}
