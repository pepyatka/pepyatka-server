define(["app/app"], function(App) {
  App.User = Ember.Object.extend({
    id: null,
    username: null,
    createdAt: null,
    updatedAt: null,
    statistics: {},
    admins: [],
    type: null,

    subscriptionsLength: function() {
      if (!this.statistics || !this.statistics.subscriptions || this.statistics.subscriptions <= 0)
        return null

      return this.statistics.subscriptions
    }.property(),

    subscribersLength: function() {
      if (!this.statistics || !this.statistics.subscribers || this.statistics.subscribers <= 0)
        return null

      return this.statistics.subscribers
    }.property(),

    postsLength: function() {
      if (!this.statistics || !this.statistics.posts || this.statistics.posts <= 0)
        return null

      return this.statistics.posts
    }.property(),

    commentsLength: function() {
      if (!this.statistics || !this.statistics.discussions || this.statistics.discussions <= 0)
        return null

      return this.statistics.discussions
    }.property(),

    likesLength: function() {
      if (!this.statistics || !this.statistics.likes || this.statistics.likes <= 0)
        return null

      return this.statistics.likes
    }.property()
  })

  App.User.reopenClass({
    resourceUrl: '/v1/users',

    find: function(userId) {
      var user = App.User.create()

      $.ajax({
        url: this.resourceUrl + '/' + userId,
        dataType: 'jsonp',
        success: function(response) {
          user.setProperties(response)
        }
      })

      return user
    },

    save: function(params, options) {
      $.ajax({
        url: this.resourceUrl,
        type: 'post',
        data: { params: params, '_method': 'patch', '_csrf': csrf_token },
        context: this,
        success: function(response) {
          options && options.success(response)
        }
      })
      return this
    }
  })
});
