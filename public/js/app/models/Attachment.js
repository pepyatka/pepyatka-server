define(["app/app"], function(App) {

  var _mediaTypeHelper = function(mediaType) {
    return function() {
      return this.get("media") == mediaType
    }
  }

  App.Attachment = Ember.Object.extend({
    isAttachmentGeneral: _mediaTypeHelper("general").property("media"),
    isAttachmentImage: _mediaTypeHelper("image").property("media"),
    isAttachmentAudio: _mediaTypeHelper("audio").property("media")
  })
});
