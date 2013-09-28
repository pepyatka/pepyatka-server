define(["globals",
        "ember",
        "core_ext",
        "ember-i18n",
        "ember-bootstrap",
        "select2",
        "moment",
        "jquery.highlight-search-results",
        "jquery.autogrow-textarea",
        "jquery.anchorlinks",
        "jquery.hashtags",
        "jquery.expander",
        "bootstrap.file-input"], function(globals, Ember){
  if (!globals.app) {
    var options = {}

    if (typeof DEBUG !== 'undefined') {
      Ember.LOG_BINDINGS = true;
      options = {
        // log when Ember generates a controller or a route from a generic class
        LOG_ACTIVE_GENERATION: true,
        // log when Ember looks up a template or a view
        LOG_VIEW_LOOKUPS: true,

        LOG_TRANSITIONS: true
        // LOG_TRANSITIONS_INTERNAL: true
      }
    }

    App = Ember.Application.create(options);

    // We need to delay initialization to load the rest of the application
    App.deferReadiness()

    globals.app = App
  }

  return globals.app;
});

