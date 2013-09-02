define(["app/app"], function(App) {
  App.SubmitCommentButton = Ember.View.extend(Ember.TargetActionSupport, {
    layout: Ember.Handlebars.compile('{{t button.post}}'),

    tagName: 'button',

    click: function() {
      var _view = this.get('_parentView.textField')

      // FIXME: what the heck is it happening here?
      if (this.get('_parentView').constructor === App.EditCommentForm)
        _view.triggerAction();
      else
        App.CommentController.actions.submit(_view, _view.get('_parentView._context.content.id'))

      _view.set('body', '')
      this.set('_parentView._parentView.isFormVisible', false)

    }
  })
});
