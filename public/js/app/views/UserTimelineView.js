define(["app/app",
        "text!templates/userTimelineTemplate.handlebars"], function(App, tpl) {
  App.UserTimelineView = Ember.View.extend({
    templateName: 'user-timeline',
    template: Ember.Handlebars.compile(tpl),

    showPostCreationForm: function() {
      return this.get("controller.user") &&
        (((this.get("controller.user.type") == 'user' || !this.get("controller.user.type")) &&
          this.get("controller.user.id") == App.properties.userId) ||
         (this.get("controller.user.type") === 'group' && this.get("controller.subscribers").filter(function(subscriber) {
           return subscriber.id == App.properties.userId;
         })));
    }.property('controller.user'),

    isGroup: function() {
      return this.get("controller.user") && this.get("controller.user.type") == 'group';
    }.property('controller.user'),

    subscribedTo: function() {
      var res = false;
      var subscribers = this.get("controller.subscribers");

      if (!subscribers) return res;

      for (var i = 0; i < subscribers.length; i++) {
        if (subscribers[i].id == App.properties.userId) {
          res = true;
          break;
        }
      }

      return res;
    }.property("controller.subscribers.@each.id", "App.properties.userId"),

    ownProfile: function() {
      return this.get("controller.user.id") == App.properties.userId;
    }.property("App.properties.userId", "controller.user.id")
  })
});
