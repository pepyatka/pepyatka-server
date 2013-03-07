var home = require('./routes/index')
  , auth = require('./routes/auth')
  , localConf = require('./../conf/envLocal.js')

var session = require('./routes/session')
  , user = require('./routes/users')
  , posts = require('./routes/posts')
  , comments = require('./routes/comments')
  , timeline = require('./routes/timeline')
  , search = require('./routes/search')
  , allUsers = require('./routes/all-users')

var models = require('./models');

var helpers = function(req, res, next) {
  res.locals.req = req
  res.locals.req.isAninymousPermitted = localConf.isAnonymousPermitted()

  next();
};

var findUser = function(req, res, next) {
  if (!req.user && localConf.isAnonymousPermitted()) {
    models.User.findAnon(function(err, user) {
      if (user) {
        req.logIn(user, function(err) {
          next();
        })
      } else {
        // redirect user to auth page.

        next()
      }
    });
  } else {
    next()
  }
}

var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  },
  function(username, clearPassword, done) {
    models.User.findByUsername(username, function (err, user) {
      // if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!user.validPassword(clearPassword)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  models.User.findById(id, function(err, user) {
    done(null, user);
  });
});

module.exports = function(app) {
  app.all('/*', helpers);

  auth.addRoutes(app);
  session.addRoutes(app);

  app.all('/*', findUser)

  home.addRoutes(app);
  user.addRoutes(app);
  posts.addRoutes(app);
  comments.addRoutes(app);
  timeline.addRoutes(app);
  search.addRoutes(app);

  allUsers.addRoutes(app);
};
