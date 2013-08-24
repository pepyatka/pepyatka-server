define(["app/app"], function(App) {
  App.EditCommentField = Ember.TextArea.extend(Ember.TargetActionSupport, {
    attributeBindings: ['class'],
    classNames: ['autogrow-short'],
    rows: 1,
    valueBinding: Ember.Binding.oneWay('controller.content.body'),
    viewName: 'textField',

    insertNewline: function() {
      this.triggerAction();

      this.set('body', '')
      this.set('_parentView._parentView.isFormVisible', false)
    },

    didInsertElement: function() {
      this.$().autogrow();
    }
  })
});
