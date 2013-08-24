define(["config", "underscore"], function(config) {
  var globals = {
    'locale': '/js/locales/default.js'
  };
  _.extend(globals, config);

  return globals;
})
