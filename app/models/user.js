exports.add_model = function(db) {
  return {
    anon: function() {
      return db.get('username:anonymous:uid')
    }
  };
}
