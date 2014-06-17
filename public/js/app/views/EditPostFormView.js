define(["app/app"], function(App) {
  App.EditPostForm = Ember.View.extend({
    // I'd no success to use isVisibleBinding property...
    classNameBindings: ['isVisible', 'visible:invisible'],
    body: '',

    actions: {
      // XXX: this is a dup of App.PartialPostView.toggleVisibility()
      // function. I just do not know how to access it from UI bindings
      toggleVisibility: function() {
        this.toggleProperty('parentView.isEditFormVisible');
      }
    },

    isVisible: function() {
      return this.get('parentView.isEditFormVisible') === true;
    }.property('parentView.isEditFormVisible'),

    autoFocus: function () {
      if (this.get('parentView.isEditFormVisible') === true) {
        this.$().hide().show();
        this.$('textarea').focus();
        this.$('textarea').trigger('keyup') // to apply autogrow
      }
    }.observes('parentView.isEditFormVisible')
  });
});
