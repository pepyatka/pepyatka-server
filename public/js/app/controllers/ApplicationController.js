define(["app/app",
        "ember",
        "controllers/CometController"], function(App, Ember) {
  App.ApplicationController = Ember.Controller.extend({
    needs: ['groups', 'tags', 'comet'],

    isLoaded: true,

    actions: {
      search: function(attrs) {
        var query = encodeURIComponent(attrs.value)

        this.transitionToRoute('search', query)
      }
    },

    currentPathDidChange: function() {
      App.properties.set('currentPath', this.get('currentPath'));
    }.observes('currentPath')
  });
});
