define(["app/app",
        "text!templates/_postTemplate.handlebars"], function(App, tpl) {
  // View to display single post. Post has following subviews (defined below):
  //  - link to show a comment form
  //  - form to add a new comment
  App.PartialPostView = Ember.View.extend({
    templateName: '_post',
    template: Ember.Handlebars.compile(tpl),

    isFormVisible: false,
    isEditFormVisible: false,
    currentUser: currentUser,

    firstTwoGroups: function() {
      var groups = this.get("controller.content.groups");
      var post   = this.get("controller.content");

      if (groups && groups.length === 1) {
        return groups.filter(function(e) {
          return e.username != post.get("createdBy.username");
        });
      }

      return groups;
    }.property("controller.content.groups"),

    myFeedOnly: function() {
      var groups = this.get("controller.content.groups");
      var post   = this.get("controller.content");

      return groups.length === 1 &&
        groups[0].username == post.get("createdBy.username");
    }.property("controller.content.groups"),

    toOrColon: function() {
      return this.get("controller.content.groups").length === 1;
    }.property("controller.content.groups"),

    colonOrBlank: function() {
      return this.get("controller.content.groups").length > 1;
    }.property("controller.content.groups"),

    toggleVisibility: function() {
      this.toggleProperty('isFormVisible');
    },

    editFormVisibility: function() {
      this.toggleProperty('isEditFormVisible');
    },

    didInsertElement: function() {
      this.$().hide().slideDown('slow');
    },

    // FIXME: this leads to an emberjs error: "action is undefined"
    willDestroyElement: function() {
      if (this.$()) {
        var clone = this.$().clone();
        this.$().replaceWith(clone);
        clone.slideUp()
      }
    },

    showAllComments: function() {
      this.content.set('showAllComments', true)
    }
  });
});
