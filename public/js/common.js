(function(root){
  require(["config"], function(config) {
    if (typeof nodeRequire === 'undefined')
      requirejs.config(config);

    require(["globals", "ember-i18n"], function(globals) {
      require([globals.locale], function(i18n){
      });
    });
  })
})(this);
