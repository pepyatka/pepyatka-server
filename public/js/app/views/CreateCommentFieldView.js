define(["app/app"], function(App) {
  App.CreateCommentField = Ember.TextArea.extend(Ember.TargetActionSupport, {
    attributeBindings: ['class'],
    classNames: ['autogrow-short'],
    rows: 1,
    valueBinding: 'body',
    viewName: 'textField',

    insertNewline: function() {
      this.triggerAction();

      this.set('_parentView._parentView.isFormVisible', false)
      this.set('body', '')
    },

    didInsertElement: function() {
      this.$().autogrow();
    }
  })
});
