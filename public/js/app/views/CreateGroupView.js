define(["app/app",
        "text!templates/createGroupTemplate.handlebars"], function(App, tpl) {
  App.CreateGroupView = Ember.View.extend({
    templateName: 'create-group',
    template: Ember.Handlebars.compile(tpl)
  });
});
