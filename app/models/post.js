var uuid = require('node-uuid')
  , models = require('../models');

exports.add_model = function(db) {
  function Post(params) {
    this.body = params.body
    this.id = params.id
    this.user_id = params.user_id
  }

  Post.find = function(post_id, callback) {
    db.hgetall('post:' + post_id, function(err, attrs) {
      attrs.id = post_id
      return callback(new Post(attrs))
    })
  }

  Post.prototype = {
    save: function(callback) {
      var that = this
      this.created_at = new Date().getTime()
      if (this.id === undefined) this.id = uuid.v4()

      db.multi()
        .hset('post:' + this.id, 'body', this.body)
        .hset('post:' + this.id, 'created_at', this.created_at)
        .exec(function(err, res) {
          models.Timeline.post(that.user_id, that.id, function() {
            return callback()
          })
        })
    }
  }
  
  return Post;
}
