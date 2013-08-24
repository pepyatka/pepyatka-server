define(["app/app"], function(App) {
  App.PostController = Ember.ObjectController.extend({
    update: function(attrs) {
      // FIXME: the only way to fetch context after insertNewLine action
      if (attrs.constructor === App.EditPostField)
        attrs = { body: attrs.value }

      var postId = this.get('id')

      App.Post.update(postId, attrs)
    },

    like: function() {
      var postId = this.get('content.id')
      App.Post.like(postId)
    },

    unlike: function() {
      var postId = this.get('content.id')
      App.Post.unlike(postId)
    },

    kill: function() {
      var postId = this.get('content.id')
      App.Post.kill(postId)
    }
  })
});
