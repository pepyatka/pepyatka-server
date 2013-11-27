define(["app/app", "jquery", "mediaelement"], function(App, $) {
  App.AudioPlayerView = Ember.View.extend({

    didInsertElement: function() {
      $("#" + this.playerId).mediaelementplayer({
        enablePluginDebug: false,
        plugins: ['flash'],
        audioWidth: 112,
        type: '',        
        pluginPath: '/assets/',
        flashName: 'flashmediaelement.swf',
        success: function (mediaElement, domObject) {

          var el = $(domObject).parents(".mejs-inner").find(".mejs-controls")
          var container = $(domObject).parents(".mejs-audio")
          el.find(".mejs-time, .mejs-time-rail").hide()

          // add event listener
          mediaElement.addEventListener('play', function(e) {
            container.addClass("full-player")
            el.find(".mejs-time").show()
            el.find(".mejs-time-rail").css("width", "218px").show()
            el.find(".mejs-time-total").css("width", "208px").show()
          }, false);

          mediaElement.addEventListener('pause', function(e) {
            container.removeClass("full-player")
            el.find(".mejs-time, .mejs-time-rail").hide()
          }, false);          
        },
      })
    }
  });
});
