define(["app/app"], function(App) {
  // Text field to post a comment. Separate view to make it hideable
  App.CommentForm = Ember.View.extend({
    // I'd no success to use isVisibleBinding property...
    classNameBindings: 'isVisible visible:invisible',
    body: '',

    actions: {
      cancelComment: function() {
        this.set('parentView.isFormVisible', false)
        this.set('textField.body', '')
      },

      // XXX: this is a dup of App.PartialPostView.toggleVisibility()
      // function. I just do not know how to access it from UI bindings
      toggleVisibility: function() {
        this.toggleProperty('parentView.isFormVisible');
      }
    },

    isVisible: function() {
      return this.get('parentView.isFormVisible') === true;
    }.property('parentView.isFormVisible'),

    autoFocus: function () {
      if (this.get('parentView.isFormVisible') === true) {
        this.$().hide().show();
        this.$('textarea').focus();
        this.$('textarea').trigger('keyup') // to apply autogrow
      }
    }.observes('parentView.isFormVisible')
  });
});
