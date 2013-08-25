define(["app/app"], function(App) {
  App.SettingsController = Ember.ObjectController.extend({
    save: function() {
      var that = this;
      var params = {
        screenName: this.get("info.screenName"),
        email: this.get("info.email"),
        receiveEmails: this.get("info.receiveEmails")
      };

      App.User.save(params, {
        success: function(response) {
          that.set('content', response);
          that.transitionToRoute("home");
        }
      });
    }
  });
});
