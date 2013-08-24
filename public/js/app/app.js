define(["globals",
        "ember",
        "core_ext",
        "ember-i18n",
        "ember-bootstrap",
        "select2",
        "moment",
        "jquery.autogrow-textarea",
        "jquery.anchorlinks",
        "jquery.hashtags",
        "jquery.expander",
        "bootstrap.file-input"], function(globals, Ember){
  if (!globals.app) {
    App = Ember.Application.create({
      LOG_TRANSITIONS: true,
      // LOG_TRANSITIONS_INTERNAL: true
    });

    // We need to delay initialization to load the rest of the application
    App.deferReadiness()

    globals.app = App
  }

  return globals.app;
});

