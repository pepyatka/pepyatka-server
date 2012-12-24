var user = require('./app/controllers/users')
var session = require('./app/controllers/session')
var home = require('./app/controllers/index')

var helpers = function(req, res, next) {
  res.locals.logged_in = function() { 
    return req.session.user_id !== undefined
  };

  next();
};

module.exports = function(app){
  app.all('/*', helpers);

  user.add_routes(app);
  session.add_routes(app);
  home.add_routes(app);
};
