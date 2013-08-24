define(["app/app"], function(App) {
  App.Comment = Ember.Object.extend({})

  App.Comment.reopenClass({
    resourceUrl: '/v1/comments',

    submit: function(attrs) {
      $.ajax({
        url: this.resourceUrl,
        type: 'post',
        data: { body: attrs.body, postId: attrs.postId, '_csrf': csrf_token },
        success: function(response) {
          console.log(response)
        }
      })
    },

    update: function(commentId, attrs) {
      $.ajax({
        url: this.resourceUrl + '/' + commentId,
        type: 'post',
        data: { body: attrs.body, '_method': 'patch', '_csrf': csrf_token },
        success: function(response) {
          console.log(response)
        }
      })
    },

    kill: function(commentId) {
      $.ajax({
        url: this.resourceUrl + '/' + commentId,
        type: 'post',
        data: { '_method': 'delete', '_csrf': csrf_token },
        success: function(response) {
          console.log(response)
        }
      })
    }
  })
});
