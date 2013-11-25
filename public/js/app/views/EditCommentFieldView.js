define(["app/app"], function(App) {
  App.EditCommentField = Ember.TextArea.extend(Ember.TargetActionSupport, {
    attributeBindings: ['class'],
    classNames: ['autogrow-short'],
    rows: 1,
    valueBinding: Ember.Binding.oneWay('controller.content.body'),
    viewName: 'textField',

    keyPress: function(event) {
      if (event.keyCode === 13) {
        this.triggerAction();

        this.set('_parentView._parentView.isFormVisible', false)
        this.set('body', '')

        return false;
      }
    },

    didInsertElement: function() {
      this.$().autogrow();
    }
  })
});
