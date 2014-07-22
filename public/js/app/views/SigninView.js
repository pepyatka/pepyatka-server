define(["app/app",
        "text!templates/signinTemplate.handlebars"], function(App, tpl) {
  App.SigninView = Ember.View.extend({
    templateName: 'signin',
    template: Ember.Handlebars.compile(tpl),

    didInsertElement: function() {
      this.tick();
    },


    willDestroyElement: function() {
      clearTimeout(this._timer);
    },


    insertNewline: function() {
      this.triggerAction();
    },

    // we need this timer so can by-pass browser autofill
    tick: function() {
      var interval = 250
      var self = this;

      if (this.$()) {
        this.set('username.value', this.$('#username').val())
        this.set('password.value', this.$('#username').val())
      }
      setTimeout(function() { self.tick(); }, interval)
    }
  });
});
