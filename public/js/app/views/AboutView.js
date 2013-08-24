define(["app/app",
        "text!templates/aboutTemplate.handlebars"], function(App, tpl) {
  App.TopView = Ember.View.extend({
    templateName: 'about',
    template: Ember.Handlebars.compile(tpl)
  });
});
