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

    actions: {
      editFormVisibility: function() {
        this.toggleProperty('isEditFormVisible');
      },

      toggleVisibility: function() {
        this.toggleProperty('isFormVisible');
      },

      showAllComments: function() {
        this.content.set('showAllComments', true)
      }
    },

    firstTwoGroups: function() {
      var groups = this.get("controller.content.groups");
      var post   = this.get("controller.content");
      var author = post.get("createdBy.username");

      if (groups && groups.length === 1) {
        return groups.filter(function(e) {
          return e.username !== author;
        });
      }

      return groups;
    }.property("controller.content.groups"),

    myFeedOnly: function() {
      var groups = this.get("controller.content.groups");
      var post   = this.get("controller.content");
      var author = post.get("createdBy.username");

      return groups.length === 1 &&
        groups[0].username === author;
    }.property("controller.content.groups"),

    toOrColon: function() {
      return this.get("controller.content.groups").length === 1;
    }.property("controller.content.groups"),

    colonOrBlank: function() {
      return this.get("controller.content.groups").length > 1;
    }.property("controller.content.groups"),


    getYoutubeLink: function() {
      var text = this.get("controller.content.body")
      var regex = /(youtube\.com\/watch\?v=|\&v=|\/\d\/|\/embed\/|\/v\/|\.be\/)([a-zA-Z0-9\-\_]+)/;
      var youtubeurl = regex.exec(text)

      if (youtubeurl !== null) {
        return "//www.youtube-nocookie.com/embed/" + youtubeurl[2] + "?rel=0&modestbranding=1&showinfo=0&controls=1&wmode=transparent"
      } else {
        return false;
      }
    }.property("controller.content.body"),

    didInsertElement: function() {
      this.$().hide().slideDown('slow');
    },

    willDestroyElement: function() {
      if (this.$()) {
        var clone = this.$().clone();
        this.$().replaceWith(clone);
        clone.slideUp()
      }
    }
  });
});
