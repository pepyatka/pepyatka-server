define(["app/app"], function(App) {
  App.SubscriberController = Ember.ObjectController.extend({
    resourceUrl: '/v1/users',
    needs: ["subscribers"],

    removeSubscriber: function(username) {
      var controller = this;
      var subscribers = controller.get("controllers.subscribers");

      App.Group.removeSubscriber({
        username: subscribers.get("content.username"),
        id: controller.get("id"),
        success: function(response) {
          if (response.status == 'success') {
            subscribers.removeObject(subscribers.findProperty("id", controller.get("id")));
          }
        }
      });
    },

    addAdmin: function() {
      var controller = this;
      var subscribers = controller.get("controllers.subscribers");

      App.Group.addAdmin({
        username: subscribers.get("content.username"),
        id: controller.get("id"),
        success: function(response) {
          if (response.status == 'success') {
            subscribers.findProperty("id", controller.get("id")).
              set("isAdmin", true);
          }
        }
      });
    },

    removeAdmin: function(event) {
      var controller = this;
      var subscribers = controller.get("controllers.subscribers");

      App.Group.removeAdmin({
        username: subscribers.get("content.username"),
        id: controller.get("id"),
        success: function(response) {
          if (response.status == 'success') {
            subscribers.findProperty("id", controller.get("id")).
              set("isAdmin", false);
          }
        }
      });
    }
  });
});
