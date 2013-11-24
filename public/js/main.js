(function(root){
  require(["config"], function(config) {
    requirejs.config(config);

    require(["globals"], function(globals) {
      require(["App"], function(App){
        var app_name = config.app_name;
        root[app_name] = App

        jQuery.getJSON("/v1/whoami", function(data) {
          App.properties.userId = data.id
          App.properties.username = data.username
          App.properties.emailMd5 = data.info.emailMd5
          App.properties.screenName = data.info ? data.info.screenName : data.username;

          // Now we are good to initialize Ember application
          App.advanceReadiness()
        })
      });
    });
  })
})(this);
