define(["app/app",
        "text!templates/signupTemplate.handlebars"], function(App, tpl) {
  App.SignupView = Ember.View.extend({
    templateName: 'signup',
    template: Ember.Handlebars.compile(tpl),

    insertNewline: function() {
      this.triggerAction();
    },

    signup: function() {
      this.get('controller').signup()
    }
  });
});
