define(["app/app",
        "text!templates/topTemplate.handlebars"], function(App, tpl) {
  App.TopView = Ember.View.extend({
    templateName: 'top',
    template: Ember.Handlebars.compile(tpl)
  });
});
