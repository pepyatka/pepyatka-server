define(["app/app", "jquery", "mediaelement"], function(App, $) {
  App.AudioPlayerView = Ember.View.extend({

    didInsertElement: function() {
      $("#" + this.playerId).mediaelementplayer({
        enablePluginDebug: false,
        plugins: ['flash'],
        type: '',        
        pluginPath: '/assets/',
        flashName: 'flashmediaelement.swf'
      })
    }
  });
});
