
/**
 * Module dependencies.
 */

var express = require('express')
  , app = express()
  , partials = require('express-partials')
  , http = require('http')
  , path = require('path')
  , uuid = require('node-uuid')

// var models = {};
// var models.user = require('./models/user');

// var path = require('path');
// if (path.existsSync('./configLocal.js')) {
//   var configLocal = require('./configLocal.js');

//   // mail = require('mail').Mail(
//   //   configLocal.getMailConfig());
//   conf = configLocal.getSiteConfig();
// }
// else {
//   log.error('Copy configDefault.js to configLocal.js.');
// }

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');

  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(partials());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(logErrors);
  app.use(clientErrorHandler);
  app.use(errorHandler);
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

app.configure('development', function(){
  app.use(express.errorHandler());
});

var server = http.createServer(app)
  , routes = require('./routes')(app)
  , io = require('socket.io').listen(server);

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

// io.sockets.on('connection', function(socket) {
//   // User wants to subscribe to room
//   socket.on('subscribe', function(data) {
//   }),

//   // User wants to unsubscribe from room
//   socket.on('unsubscribe', function(data) {
//   }),

//   // New message sent to group
//   socket.on('message', function(data) {
//   }),

//   // Clean up on disconnect
//   socket.on('disconnect', function() {
//   })
// }
