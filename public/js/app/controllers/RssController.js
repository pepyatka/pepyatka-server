define(["app/app"], function(App) {
  App.RssController = Ember.ObjectController.extend({
    needs: "settings",

    removeUrl: function() {
      this.get("controllers.settings.rss").removeObject(this.get("content"));
    }
  });
});
