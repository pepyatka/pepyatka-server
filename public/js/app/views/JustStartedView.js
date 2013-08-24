define(["app/app",
        "text!templates/justStartedTemplate.handlebars"], function(App, tpl) {
  App.JustStarted = Ember.View.extend({
    templateName: 'just-started',
    template: Ember.Handlebars.compile(tpl),

    justStarted: function() {
      return true
    }.property()
  });
});
