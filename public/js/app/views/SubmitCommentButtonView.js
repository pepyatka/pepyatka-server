define(["app/app"], function(App) {
  App.SubmitCommentButton = Ember.View.extend(Ember.TargetActionSupport, {
    layout: Ember.Handlebars.compile('{{t button.post}}'),

    tagName: 'button',

    click: function() {
      var _view = this.get('_parentView.textField')

      _view.triggerAction();

      _view.set('body', '')
      this.set('_parentView._parentView.isFormVisible', false)

    }
  })
});
