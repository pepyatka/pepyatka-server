define(["app/app",
        "text!templates/searchTemplate.handlebars"], function(App, tpl) {
  App.SearchView = Ember.View.extend({
    templateName: 'search',
    template: Ember.Handlebars.compile(tpl)
  });
});
