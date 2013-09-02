define(["app/app",
        "text!templates/signupTemplate.handlebars"], function(App, tpl) {
  App.SignupView = Ember.View.extend({
    templateName: 'signup',
    template: Ember.Handlebars.compile(tpl),

    actions: {
      signup: function() {
        this.get('controller').signup()
      }
    },

    insertNewline: function() {
      this.triggerAction();
    }
  });
});
