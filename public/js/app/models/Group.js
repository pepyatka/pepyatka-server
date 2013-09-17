define(["app/app"], function(App) {
  App.Group = Ember.Object.extend({
    content: {}
  })
  App.Group.reopenClass({
    resourceUrl: '/v1/users',
    suffix: '/subscriptions',

    // TODO: Move to appropriate place
    removeSubscriber: function(options) {
      $.ajax({
        url: this.resourceUrl
          + '/'
          + options.username
          + '/subscribers/'
          + options.id,
        dataType: 'jsonp',
        type: 'post',
        data: { '_method': 'delete', '_csrf': csrf_token },
        success: options.success ? options.success : null
      });
    },

    // TODO: Move to appropriate place
    addAdmin: function(options) {
      $.ajax({
        url: this.resourceUrl
          + '/'
          + options.username
          + '/subscribers/'
          + options.id
          + "/admin",
        dataType: 'jsonp',
        type: 'post',
        data: { '_csrf': csrf_token },
        success: options.success ? options.success : null
      });
    },

    // TODO: Move to appropriate place
    removeAdmin: function(options) {
      $.ajax({
        url: this.resourceUrl
          + '/'
          + options.username
          + '/subscribers/'
          + options.id
          + "/unadmin",
        dataType: 'jsonp',
        type: 'post',
        data: { '_csrf': csrf_token },
        success: options.success ? options.success : null
      });
    },

    // TODO: Move to appropriate place
    findAllSubscribers: function(username) {
      var subscribers = Ember.ArrayProxy.create({content: [], isLoaded: false});

      $.ajax({
        url: this.resourceUrl + '/' + username + '/subscribers',
        dataType: 'jsonp',
        context: this,
        success: function(response) {
          response.subscribers.forEach(function(attrs) {
            if (response.admins) {
              attrs.isAdmin = response.admins.indexOf(attrs.id) != -1;
            }

            var subscriber = App.Subscriber.create(attrs);
            subscribers.addObject(subscriber);
          }, this);

          subscribers.set('username', username);
          subscribers.set('admins', response.admins);

          subscribers.set('isLoaded', true);
        }
      });
      return subscribers;
    },


    // TODO: Move to appropriate place
    findAllWithUsers: function(username) {
      var groups = Ember.ArrayProxy.create({content: [], isLoaded: false});

      var success = function(response) {
        response.forEach(function(attrs) {
          if (groups.indexOf(attrs.user.username) === -1 &&
              attrs.name === 'Posts') {
            // TODO: build Group object instead of using attrs directly
            groups.addObject(attrs);
          }
        });

        groups.set('isLoaded', true);
      };

      $.ajax({
        url: this.resourceUrl + '/' + username + this.suffix,
        context: this,
        type: 'get',
        success: success,
        error: App.helpers.handleAjaxError
      })

      return groups
    },

    findAll: function() {
      var groups = Ember.ArrayProxy.create({content: []});

      var success = function(response) {
        response.forEach(function(attrs) {
          // NOTE: since there is no difference between a user and a
          // group we need to process all subscriptions and select
          // only and only objects that are:
          // 1) group
          // 2) this is not me
          // TODO: review the second condition
          if (attrs.user.type === 'group' &&
              groups.indexOf(attrs.user.username) === -1 &&
              attrs.name === 'Posts') {
            // TODO: build Group object instead of using attrs directly
            groups.addObject(attrs)
          }
        })
      }

      $.ajax({
        url: this.resourceUrl + '/' + App.properties.get('username') + this.suffix,
        context: this,
        type: 'get',
        success: success,
        error: App.helpers.handleAjaxError
      })

      return groups
    },

    submit: function(attrs, options) {
      attrs._csrf = csrf_token
      $.ajax({
        url: this.resourceUrl,
        type: 'post',
        data: attrs,
        dataType: 'jsonp',
        success: options && options.success ? options.success : null,
        error: options && options.error ? options.error : null
      });
      return this;
    }
  });
});
