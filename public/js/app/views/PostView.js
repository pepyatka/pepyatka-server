define(["app/app",
        "text!templates/postTemplate.handlebars"], function(App, tpl) {
  App.PostView = Ember.View.extend({
    templateName: 'post',
    template: Ember.Handlebars.compile(tpl),

    isFormVisible: false,
    isEditFormVisible: false,

    actions: {
      editFormVisibility: function() {
        this.toggleProperty('isEditFormVisible');
      },

      toggleVisibility: function() {
        this.toggleProperty('isFormVisible');
      }
    },

    firstTwoGroups: function() {
      var groups = this.get("controller.content.groups");
      var post   = this.get("controller.content");

      if (groups) {
        if (groups.length === 1) {
          return groups.filter(function(e) {
            return e.username != post.get("createdBy.username");
          });
        }
      }

      return groups;
    }.property("controller.content.groups"),

    myFeedOnly: function() {
      var groups = this.get("controller.content.groups");
      var post   = this.get("controller.content");

      if (!groups)
        return true

      return groups.length === 1 &&
        groups[0].username == post.get("createdBy.username");
    }.property("controller.content.groups"),

    toOrColon: function() {
      return this.get("controller.content.groups").length === 1;
    }.property("controller.content.groups"),

    colonOrBlank: function() {
      return this.get("controller.content.groups").length > 1;
    }.property("controller.content.groups"),

    postOwner: function() {
      return this.get("controller.content.createdBy") &&
        this.get("controller.content.createdBy.id") === App.properties.userId &&
        this.get("controller.content.createdBy.id") !== 'anonymous';
    }.property('controller.content'),

    getYoutubeLink: function() {
      var text = this.get("controller.content.body")
      var regex = /(youtube\.com\/watch\?v=|\&v=|\/\d\/|\/embed\/|\/v\/|\.be\/)([a-zA-Z0-9\-\_]+)/;
      var youtubeurl = regex.exec(text)

      if (youtubeurl !== null) {
        return "//www.youtube-nocookie.com/embed/" + youtubeurl[2] + "?rel=0&modestbranding=1&showinfo=0&controls=1&wmode=transparent"
      } else {
        return false;
      }
    }.property("controller.content.body")
  });
});
