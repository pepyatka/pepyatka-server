define(["app/app"], function(App) {
  App.CommentController = Ember.ObjectController.extend({
    actions: {
      update: function(attrs) {
        // FIXME: the only way to fetch context after insertNewLine action
        if (attrs.constructor === App.EditCommentField)
          attrs = { body: attrs.value }

        var commentId = this.get('id')

        App.Comment.update(commentId, attrs)
      },

      kill: function(attrs) {
        var commentId = this.get('id')

        App.Comment.kill(commentId)
      }
    }
  })

  App.CommentController.reopenClass({
    actions: {
      submit: function(attrs, postId) {
        if (attrs.constructor === App.CreateCommentField)
          attrs = { body: attrs.value, postId: postId }

        App.Comment.submit(attrs)
      }
    }
  })
});
