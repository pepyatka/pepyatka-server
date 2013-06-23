var express = require('express')
  , app = express()
  , http = require('http')
  , path = require('path')
  , engine = require('ejs-locals')
  , fs = require('fs')
  , flash = require('connect-flash')
  , async = require('async')
  , passport = require('passport')
  , environment = require('./environment.js')

module.exports = app;

if (fs.existsSync('./conf/envLocal.js')) {
  var configLocal = require('./conf/envLocal.js');

  // global variable
  conf = configLocal.getAppConfig();
}
else {
  console.log('Copy ./conf/envDefault.js to ./conf/envLocal.js.');
  throw new Error('Missing configuration file')
}

app.configure(function() {
  app.engine('ejs', engine);
  app.set('view engine', 'ejs');

  app.set('port', conf.port);
  app.set('views', __dirname + '/app/scripts/views');

  app.enable("jsonp callback");

  app.use(express.favicon());

  app.use(express.logger('dev'));

  app.use(express.bodyParser({
    uploadDir: __dirname + '/tmp',
    keepExtensions: true
  }))
  app.use(express.limit('50mb'));

  app.use(express.methodOverride());

  app.use(express.cookieParser(conf.secret));
  var RedisStore = require('connect-redis')(express);
  app.use(express.session({
    secret: conf.secret,
    store: new RedisStore,
    cookie: { secure: false, maxAge:86400000 }
  }));
  app.use(flash());

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(logErrors);
  app.use(clientErrorHandler);
  app.use(errorHandler);
  app.use(express.csrf());
});

function clientErrorHandler(err, req, res, next) {
  if (req.xhr) {
    res.send(500, { error: 'Whoops!' });
  } else {
    next(err);
  }
}

function errorHandler(err, req, res, next) {
  res.status(500);
  res.render('error', { error: err });
}

function logErrors(err, req, res, next) {
  console.error(err.stack);
  next(err);
}

var server = http.createServer(app)
  , pubsub = require('./pubsub').listen(server)
  , routes = require('./app/routes')(app)

environment.init(function(err, res) {
  server.listen(app.get('port'), function() {
    console.log("Express server listening on port " + app.get('port'));
    console.log("Server is running on " + (process.env.NODE_ENV || "development") + " mode")
  });
})
