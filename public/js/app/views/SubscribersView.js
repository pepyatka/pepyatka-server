define(["app/app",
        "text!templates/subscribersTemplate.handlebars"], function(App, tpl) {
  App.SubscribersView = Ember.View.extend({
    templateName: 'subscribers',
    template: Ember.Handlebars.compile(tpl),

    isOwner: function() {
      return this.get("controller.content.username") == App.properties.username ||
        this.get("controller.content.admins") && this.get("controller.content.admins").indexOf(App.properties.userId) !== -1;
    }.property('controller.content.username', 'App.properties.username', 'controller.content.admins'),

    hasAdmins: function() {
      return this.get("controller.content.admins") !== undefined;
    }.property('controller.content.admins'),

    showManagement: function() {
      return App.properties.get('currentPath') === 'manageSubscribers'
    }.property('App.properties.currentPath')
  });
});
