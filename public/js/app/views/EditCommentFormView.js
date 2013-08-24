define(["app/app"], function(App) {
  App.EditCommentForm = Ember.View.extend({
    body: '',

    autoFocus: function () {
      if (this.get('parentView.isEditFormVisible') === true) {
        this.$().hide().show();
        this.$('textarea').focus();
        // FIXME: next line breaks content.body bindings in EditCommentField?
        //this.$('textarea').trigger('keyup') // to apply autogrow
      }
    }.observes('parentView.isEditFormVisible'),

    // FIXME: autoFocus doesn't observe isEditFormVisible?
    didInsertElement: function() {
      this.autoFocus()
    },

    // XXX: this is a dup of App.PartialPostView.toggleVisibility()
    // function. I just do not know how to access it from UI bindings
    editFormVisibility: function() {
      this.toggleProperty('parentView.isEditFormVisible');
    }
  });
});
