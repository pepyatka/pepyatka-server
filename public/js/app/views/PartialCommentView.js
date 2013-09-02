define(["app/app",
        "text!templates/_commentTemplate.handlebars"], function(App, tpl) {
  App.PartialCommentView = Ember.View.extend({
    templateName: '_comment',
    template: Ember.Handlebars.compile(tpl),

    isEditFormVisible: false,

    actions: {
      editFormVisibility: function() {
        this.toggleProperty('isEditFormVisible');
      }
    },

    didInsertElement: function() {
      this.$().hide().slideDown('fast');
    },

    // FIXME: this leads to an emberjs error: "action is undefined"
    willDestroyElement: function() {
      if (this.$()) {
        var clone = this.$().clone();
        this.$().replaceWith(clone);
        clone.slideUp()
      }
    },

    commentOwner: function() {
      // FIXME: why is it binded to content.content.createdBy not just
      // content.createdBy?
      return this.get('content.content.createdBy.id') == App.properties.userId &&
        this.get('content.content.createdBy.username') != 'anonymous'
    }.property('content.content.createdBy.id')
  })
});
