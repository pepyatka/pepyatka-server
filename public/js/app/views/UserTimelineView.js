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

    isGroupAdmin: function() {
      return this.get("isGroup") && _.find(this.get("controller.user.admins"), function(x) {
        return x.id == App.properties.userId;
      });
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
    }.property("App.properties.userId", "controller.user.id"),

    // these Length method are workaround until Ember get support of
    // bound helpers with block so we can use something like this:
    // {{#ifpositive content.user.statistics.subscriptions}}
    subscriptionsLength: function() {
      var controller = this.get('controller')
      var val = controller.get('content.user.statistics.subscriptions')

      if (val && val > 0)
        return val

      return null
    }.property('controller.user.statistics.subscriptions'),

    subscribersLength: function() {
      var controller = this.get('controller')
      var val = controller.get('content.user.statistics.subscribers')

      if (val && val > 0)
        return val

      return null
    }.property('controller.user.statistics.subscribers'),

    postsLength: function() {
      var controller = this.get('controller')
      var val = controller.get('content.user.statistics.posts')

      if (val && val > 0)
        return val

      return null
    }.property('controller.user.statistics.posts'),

    commentsLength: function() {
      var controller = this.get('controller')
      var val = controller.get('content.user.statistics.comments')

      if (val && val > 0)
        return val

      return null
    }.property('controller.user.statistics.comments'),

    likesLength: function() {
      var controller = this.get('controller')
      var val = controller.get('content.user.statistics.likes')

      if (val && val > 0)
        return val

      return null
    }.property('controller.user.statistics.likes')
  })
});
