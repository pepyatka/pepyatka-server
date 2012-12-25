// var user = require('./routes/users')
// var session = require('./routes/session')
var home = require('./routes/index')

var models = require('./models');

var helpers = function(req, res, next) {
  res.locals.logged_in = function() {
    return req.session.user_id !== undefined
  };

  next();
};

var findUser = function(req, res, next) {
  models.User.anon(function(value) {
    req.session.user_id = value;
      
    next()
  });
}

module.exports = function(app){
  app.all('/*', helpers, findUser);

  // user.add_routes(app);
  // session.add_routes(app);
  home.add_routes(app);
};
