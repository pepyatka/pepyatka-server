define(["app/app"], function(App) {
  App.SettingsController = Ember.ObjectController.extend({
    needs: "rss",

    actions: {
      addUrl: function() {
        this.get("rss").addObject({url: ""});
      },

      save: function() {
        var that = this;
        var params = {
          screenName: this.get("info.screenName"),
          email: this.get("info.email"),
          rss: this.get("deobjectizedRSS"),
          receiveEmails: this.get("info.receiveEmails"),
          userId: this.get("id")
        };


        App.User.save(params, {
          success: function(response) {
            that.set('content', response);
            if (response.type == "user") {
              App.properties.set("screenName", response.info.screenName);
              that.transitionToRoute("home");
            } else {
              that.transitionToRoute("user", that.get("username"));

            }
          },
          error: function(response) {
            that.set("content.errors", JSON.parse(response.responseText).errors);
            console.log(that.get("content.errors"));
          }
        });
      }
    }
  });
});
