define(["app/app"], function(App) {
  App.SubscribersController = Ember.ArrayController.extend({
    itemController: "subscriber"
  })
});
