define(["app/app"], function(App) {
  App.RssController = Ember.ObjectController.extend({
    needs: "settings",

    actions: {
      removeUrl: function() {
        this.get("controllers.settings.rss").removeObject(this.get("content"));
      }
    }
  });
});
