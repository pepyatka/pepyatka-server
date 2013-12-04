define(["app/app",
        "text!templates/youtubeEmbedded.handlebars"], function(App, tpl) {
  App.YoutubeEmbeddedView = Ember.View.extend({
    templateName: 'youtubeEmbedded',
    template: Ember.Handlebars.compile(tpl),

    isPlayerFrameVisible: false,

    actions: {
      toggleVisibility: function() {
        this.toggleProperty('isPlayerFrameVisible');
      }
    },

    isPlayerVisible: function() {
      return this.get('isPlayerFrameVisible') === true;
    }.property('isPlayerFrameVisible'),

    getYoutubeLink: function() {      
      var text = this.get("text")
      return App.YoutubeHelper.getVideoUrl(text)
    }.property("text"),

    getYoutubeThumbnail: function() {
      var text = this.get("text")
      var link = App.YoutubeHelper.getVideoThumbnailUrl(text)
      if (link)
        return "background:url(" + link + ")"
      else
        return false
    }.property("text")
  })
});


      
