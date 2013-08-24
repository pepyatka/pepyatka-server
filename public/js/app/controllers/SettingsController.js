define(["app/app"], function(App) {
  App.SettingsController = Ember.ObjectController.extend({
    save: function(params) {
      var that = this

      App.User.save(params, {
        success: function(response) {
          that.set('content', response);
          that.transitionToRoute("home");
        }
      })
    }
  })
});
