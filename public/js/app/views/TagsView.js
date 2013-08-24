define(["app/app",
        "text!templates/tagsTemplate.handlebars"], function(App, tpl) {
  App.Tags = Ember.View.extend({
    templateName: 'tags',
    template: Ember.Handlebars.compile(tpl),

    tagName: 'ul'
  });
});
