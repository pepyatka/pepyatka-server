// var user = require('./routes/users')
// var session = require('./routes/session')
var home = require('./routes/index')
  , posts = require('./routes/posts')
  , comments = require('./routes/comments')

var models = require('./models');

var helpers = function(req, res, next) {
  res.locals.logged_in = function() {
    return req.session.user_id !== undefined
  };

  res.locals._ = require('underscore');

  next();
};

var findUser = function(req, res, next) {
  if (req.session.user_id === undefined) {
    models.User.anon(function(value) {
      req.session.user_id = value;
      
      next()
    });
  } else {
    next()
  }
}

var getUser = function(req, res, next) {
  models.User.find(req.session.user_id, function(user) {
    res.locals.current_user = user

    next();
  })
}

module.exports = function(app){
  app.all('/*', helpers, findUser, getUser);

  // user.add_routes(app);
  // session.add_routes(app);
  home.add_routes(app);
  posts.add_routes(app);
  comments.add_routes(app);
};
