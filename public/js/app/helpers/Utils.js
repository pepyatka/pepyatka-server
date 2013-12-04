define(["app/app",
	"ember"], function(App, Ember) {
  App.YoutubeHelper = {
    extractId: function(text) {
      var regex = /(youtube\.com\/watch\?v=|\&v=|\/\d\/|\/embed\/|\/v\/|\.be\/)([a-zA-Z0-9\-\_]+)/;
      var youtubeurl = regex.exec(text)

      if (youtubeurl !== null) {
        return youtubeurl[2]
      } else {
        return false
      }
    },

    getVideoUrl: function(text) {
      var yid = App.YoutubeHelper.extractId(text)
      if (yid)
        return "//www.youtube-nocookie.com/embed/" + yid + "?rel=0&modestbranding=1&showinfo=0&controls=1&wmode=transparent&autoplay=1"
      else
        return false
    },

    getVideoThumbnailUrl: function(text) {
      var yid = App.YoutubeHelper.extractId(text)
      if (yid)
        return "//img.youtube.com/vi/" + yid + "/default.jpg"
      else
        return false
    }
  }
});
