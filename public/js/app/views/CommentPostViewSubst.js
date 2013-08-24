define(["app/app"], function(App) {
  App.CommentPostViewSubst = Ember.View.extend(Ember.TargetActionSupport, {
    classNameBindings: 'isVisible visible:invisible',

    click: function() {
      this.triggerAction();
    },

    // XXX: this is a dup of App.PartialPostView.toggleVisibility()
    // function. I just do not know how to access it from UI bindings
    toggleVisibility: function() {
      this.toggleProperty('parentView.isFormVisible');
    },

    // this method does not observe post comments as a result it won't
    // display additional Add comment link if user does not refresh the page
    isVisible: function() {
      var post = this.get('_context')
      var comments = post.comments || []

      if (comments.length < 4)
        return false

      // NOTE: though following approach is a nice once, FF implements
      // it differently -- just checks number of comments.

      // // return false if comments do not include current user
      // // var exist = post.createdBy.id == App.properties.userId
      // var exist = false
      // comments.forEach(function(comment) {
      //   exist = exist || comment.createdBy.id == App.properties.userId
      // })

      // // If user have not commented this post there is no need to
      // // display additional comment link at the bottom of the post.
      // if (!exist)
      //   return false

      return this.get('parentView.isFormVisible') === false;
    }.property('parentView.isFormVisible')
  })
});
