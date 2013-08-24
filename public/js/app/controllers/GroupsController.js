define(["app/app"], function(App) {
  App.GroupsController = Ember.ArrayController.extend({
    submit: function() {
      var controller = this;

      App.Group.submit({
        username: this.get("name")
      }, {
        success: function() {
          controller.transitionToRoute("user", controller.get("name"));
        },
        error: function() {
          controller.transitionToRoute("groups");
        }
      });
    }
  })
});
