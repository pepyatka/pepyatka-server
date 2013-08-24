define(["app/app",
        "text!templates/signinTemplate.handlebars"], function(App, tpl) {
  App.SigninView = Ember.View.extend({
    templateName: 'signin',
    template: Ember.Handlebars.compile(tpl),

    insertNewline: function() {
      this.triggerAction();
    }
  });
});
