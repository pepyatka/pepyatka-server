define(["app/app",
        "text!templates/paginationTemplate.handlebars"], function(App, tpl) {
  App.Pagination = Ember.View.extend({
    templateName: 'pagination',
    template: Ember.Handlebars.compile(tpl),
  });
});
