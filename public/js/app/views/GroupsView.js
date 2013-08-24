define(["app/app",
        "text!templates/groupsTemplate.handlebars"], function(App, tpl) {
  App.GroupsView = Ember.View.extend({
    templateName: 'groups',
    template: Ember.Handlebars.compile(tpl),

    tagName: 'ul'
  });
});
