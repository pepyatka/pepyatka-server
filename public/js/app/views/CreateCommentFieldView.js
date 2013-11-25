define(["app/app"], function(App) {
  App.CreateCommentField = Ember.TextArea.extend(Ember.TargetActionSupport, {
    attributeBindings: ['class'],
    classNames: ['autogrow-short'],
    rows: 1,
    valueBinding: 'body',
    viewName: 'textField',

    keyPress: function(event) {
      if (event.keyCode === 13) {
        App.CommentController.actions.submit(this, this.get('_parentView._context.content.id'))

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
