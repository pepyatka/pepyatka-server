(function(root){
  require(["config"], function(config) {
    requirejs.config(config);

    require(["globals", "ember-i18n"], function(globals) {
      require([globals.locale, "App"], function(i18n, App){
        var app_name = config.app_name;
        root[app_name] = App

        jQuery.getJSON("/v1/whoami", function(data) {
          App.properties.userId = data.id
          App.properties.username = data.username
          App.properties.screenName = data.info.screenName

          // Not we are good to intialize Ember application
          App.advanceReadiness()
        })
      });
    });
  })
})(this);
