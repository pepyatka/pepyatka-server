define(["app/app",
        "text!templates/sendToFieldTemplate.handlebars"], function(App, tpl) {
  App.SendToField = Ember.View.extend({
    templateName: 'sendToField',
    template: Ember.Handlebars.compile(tpl),

    viewName: 'sendTo',
    enableSelect: false,
    isVisible: false,

    actions: {
      toggleEditability: function() {
        var value = !this.get('enableSelect')
        this.set('enableSelect', value)
        this.$("#sendToSelect").select2("enable", value)
        this.$("#showHide").toggle()
      }
    },

    onVisible: function() {
      this.$().hide().slideDown('fast');

      var coord = this.$('.select2-search-field').offset()
      this.$("#showHide").offset(coord)
    }.observes('isVisible'),

    // NOTE: we use observe in this case not didInsertElement as select2
    // component depends on timeline data which might not be loaded yet
    onContent: function() {
      if (this.get('controller.content.id')) {
        var that = this
        Ember.run.next(function() {
          that.$("#sendToSelect").select2()
          that.$("#sendToSelect").select2("enable", that.get('enableSelect'))
          var myFeed = that.get('controller.content.postsTimelineId') ||
            that.get('controller.content.id')
          that.$("#sendToSelect").val(myFeed).trigger('change')
        })
      }
    }.observes('controller.content.id')
  })
});
