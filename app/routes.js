
var home = require('./routes/index')
  , posts = require('./routes/posts')
  , comments = require('./routes/comments')
  , timeline = require('./routes/timeline')

var session = require('./routes/session')
  , user = require('./routes/users')

var models = require('./models');

var helpers = function(req, res, next) {
  res.locals.loggedIn = function() {
    return req.session.userId !== undefined
  };

  next();
};

var findUser = function(req, res, next) {
  if (req.session.userId === undefined) {
    models.User.anon(function(userId) {
      req.session.userId = userId;
      
      next()
    });
  } else {
    // XXX: this could be a broken session as we restart server and
    // flush data quite frequently

    next()
  }
}

var getUser = function(req, res, next) {
  models.User.findById(req.session.userId, function(user) {
    if (user) {
      res.locals.currentUser = user
      next();
    } else {
      delete req.session.userId
      // and redirect user to auth page. 

      // however for the time being let's just call findUser one more time
      findUser(req, res, next())
    }
  })
}

var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  },
  function(username, clearPassword, done) {
    models.User.findByUsername(username, function (user) {
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
  models.User.findById(id, function(user) {
    done(null, user);
  });
});

module.exports = function(app) {
  app.all('/*', helpers);

  user.addRoutes(app);
  session.addRoutes(app);

  app.all('/*', findUser, getUser)

  home.addRoutes(app);
  posts.addRoutes(app);
  comments.addRoutes(app);
  timeline.addRoutes(app);
};
