define(["app/app"], function(App) {
  App.User = Ember.Object.extend({
    id: null,
    username: null,
    createdAt: null,
    updatedAt: null,
    statistics: {},
    admins: [],
    type: null,

    deobjectizedRSS: function() {
      return this.get("rss").map(function(e) {
        return e.url;
      });
    }.property("rss.length"),

    transformRSS: function() {
      var transformed = [];
      var isAlreadyTransformed = true;

      this.get("rss").forEach(function(url) {
        if (url.url) {
          isAlreadyTransformed = isAlreadyTransformed && true;
          transformed.push(url);
        } else {
          isAlreadyTransformed = false;
          transformed.push({url: url});
        }
      });

      if (!isAlreadyTransformed) {
        this.set("rss", transformed);
      }
    }.observes("rss")
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
