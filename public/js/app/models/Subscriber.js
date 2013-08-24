define(["app/app"], function(App) {
  App.Subscriber = Ember.Object.extend({
    id: null,
    username: null,
    isAdmin: null
  })
});
