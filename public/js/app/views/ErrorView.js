define(["app/app",
        "text!templates/errorTemplate.handlebars"], function(App, tpl) {
  App.ErrorView = Ember.View.extend({
    templateName: 'error',
    template: Ember.Handlebars.compile(tpl)
  });
});
