(function(root){
  require(["config"], function(config) {
    requirejs.config(config);

    require(["globals", "ember-i18n"], function(globals) {
      require([globals.locale], function(i18n){
      });
    });
  })
})(this);
