define(["app/app",
        "ember",
        "controllers/CometController"], function(App, Ember) {
  App.ApplicationController = Ember.Controller.extend({
    needs: ['groups', 'tags', 'comet'],

    isLoaded: true,

    currentPathDidChange: function() {
      App.properties.set('currentPath', this.get('currentPath'));
    }.observes('currentPath'),

    search: function(attrs) {
      var query = encodeURIComponent(attrs.value)

      this.transitionToRoute('search', query)
    }
  });
});
