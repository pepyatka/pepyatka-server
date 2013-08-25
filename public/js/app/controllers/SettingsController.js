define(["app/app"], function(App) {
  App.SettingsController = Ember.ObjectController.extend({
    needs: "rss",

    addUrl: function() {
      this.get("rss").addObject({url: ""});
    },

    save: function() {
      var that = this;
      var params = {
        screenName: this.get("info.screenName"),
        email: this.get("info.email"),
        rss: this.get("deobjectizedRSS"),
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
