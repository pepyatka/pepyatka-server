define(["app/app"], function(App) {
  App.Top = Ember.Object.extend({});

  App.Top.reopenClass({
    resourceUrl: '/v1/top',

    findAll: function(category) {
      var users = Ember.ArrayProxy.create({content: [], isLoaded: false});

      $.ajax({
        url: this.resourceUrl + '/' + category,
        dataType: 'jsonp',
        context: this,
        success: function(response) {
          response.forEach(function(user) {
            users.addObject(App.User.create(user));
          });

          users.set('category', category);

          users.set('isLoaded', true);
        }
      });
      return users;
    }
  });
});
