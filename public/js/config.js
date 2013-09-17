define({
  app_name: "App",
  shim : {
    'ember' : {
      deps: ['handlebars', 'jquery'],
      exports: 'Ember'
    },
    'ember-i18n' : {
      deps: ['ember']
    },
    'ember-bootstrap': {
      deps: ['ember']
    },
    'underscore': {
      deps: ['jquery'],
      exports: '_'
    },
    'json2': {
      exports: 'JSON'
    },
    'handlebars': {
      exports: 'Handlebars'
    }
  },
  hbs: {
    disableI18n: true,
    templateExtension: 'handlebars'
  },
  paths : {
    /* application */
    'App': 'app/main',
    'models': 'app/models',
    'views': 'app/views',
    'controllers': 'app/controllers',
    'templates': 'app/templates',

    /* libs */
    'jquery': 'libs/jquery/1.9.1/jquery',
    'bootstrap': 'libs/bootstrap/2.3.2/bootstrap.min',
    'handlebars': 'libs/handlebars/1.0.0/handlebars',
    'ember': 'libs/ember/1.0.0/ember',
    'ember-bootstrap': 'libs/ember-bootstrap/0.0.2/ember-bootstrap.min',
    'ember-i18n': 'libs/ember-i18n/1.3.2/ember-i18n',
    'moment': 'libs/moment/1.7.2/moment.min',
    'select2': 'libs/select2/3.4.1/select2',
    'underscore': 'libs/underscore/1.4.4/underscore.min',
    'socket.io': '/socket.io/socket.io',
    'json2': 'libs/json2/1.0.2/json2',

    /* requirejs-plugins */
    'text': 'libs/requirejs-plugins/text',
    'hbs': 'libs/requirejs-plugins/hbs',
    'domReady': 'libs/requirejs-plugins/domReady',

    /* plugins */
    'core_ext': 'libs/plugins/core_ext',
    'holder': 'libs/plugins/holder',
    'jquery.anchorlinks': 'libs/plugins/jquery.anchorlinks',
    'jquery.autogrow-textarea': 'libs/plugins/jquery.autogrow-textarea',
    'jquery.expander': 'libs/plugins/jquery.expander.min',
    'jquery.hashtags': 'libs/plugins/jquery.hashtags',
    'jquery.highlight-search-results': 'libs/plugins/jquery.highlight-search-results',
    'jquery.history': 'libs/plugins/jquery.history',
    'bootstrap.file-input': 'libs/plugins/bootstrap.file-input',
    'i18nprecompile': 'libs/plugins/i18nprecompile'
  }
});
