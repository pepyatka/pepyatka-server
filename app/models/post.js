exports.add_model = function(db) {
  function Post(params) {
    this.body = params.body
  }

  Post.prototype = {
    find: function() {
    },

    save: function() {
      this.created_at = new Date().getTime()

      // TODO: save to db
    }
  }
  
  return Post;
}
