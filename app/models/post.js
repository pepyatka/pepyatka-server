exports.add_model = function(db) {
  function Post(params) {
    this.body = params.body
  }

  Post.find = function() {
    db.hgetall('post:' + user_id, function(err, res) {
      return callback(res)
    })
  }

  Post.prototype = {
    save: function() {
      this.created_at = new Date().getTime()

      // TODO: save to db
    }
  }
  
  return Post;
}
