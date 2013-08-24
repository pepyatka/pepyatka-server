define(["app/app",
        "text!templates/subscriptionsTemplate.handlebars"], function(App, tpl) {
  App.SubscriptionsView = Ember.View.extend({
    templateName: 'subscriptions',
    template: Ember.Handlebars.compile(tpl)
  });
});
