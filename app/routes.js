var localConf = require('./../conf/envLocal.js')
  , jwt = require('jsonwebtoken')
  , config = require('../conf/envLocal')

var authV1     = require('./routes/v1/auth')
  , sessionV1  = require('./routes/v1/session')
  , usersV1    = require('./routes/v1/users')
  , groupsV1   = require('./routes/v1/groups')
  , postsV1    = require('./routes/v1/posts')
  , commentsV1 = require('./routes/v1/comments')
  , timelineV1 = require('./routes/v1/timeline')
  , searchV1   = require('./routes/v1/search')
  , tagsV1     = require('./routes/v1/tags')
  , statsV1    = require('./routes/v1/stats')

  , authV2     = require('./routes/v2/auth')
  , sessionV2  = require('./routes/v2/session')
  , usersV2    = require('./routes/v2/users')
  , groupsV2   = require('./routes/v2/groups')
  , postsV2    = require('./routes/v2/posts')
  , commentsV2 = require('./routes/v2/comments')
  , timelineV2 = require('./routes/v2/timeline')
  , searchV2   = require('./routes/v2/search')
  , tagsV2     = require('./routes/v2/tags')
  , statsV2    = require('./routes/v2/stats')

  , rss      = require('./routes/rss')
  , bookmarklet = require('./routes/bookmarklet')

var models = require('./models');

var helpers = function(req, res, next) {
  res.locals.req = req
  res.locals.req.isAninymousPermitted = localConf.isAnonymousPermitted()

  next();
};

var findUser = function(req, res, next) {
  if (conf.remoteUser) {
    if (req.headers['x-remote-user']) {
      models.User.findOrCreateByUsername(req.headers['x-remote-user'].toLowerCase(), function(err, user) {
        if (user) {
          req.logIn(user, function(err) { next(); })
        } else {
          next()
        }
      })
    } else {
      req.client.destroy();
      res.writeHead(200, {'Connection': 'close'});
      res.end()
    }
  } else if (req.body.token || req.query.token) {
    var secret = config.getAppConfig()['secret']
    var token = req.body.token || req.query.token
    jwt.verify(token, secret, function(err, decoded) {
      models.User.findById(decoded.userId, function(err, user) {
        req.user = user
        next()
      });
    });
  } else if (!req.user && localConf.isAnonymousPermitted()) {
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
  , LocalStrategy = require('passport-local').Strategy

passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  },
  function(username, clearPassword, done) {
    models.User.findByUsername(username, function (err, user) {
      if (err) { return done(err); }
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

  authV1.addRoutes(app);
  sessionV1.addRoutes(app);
  authV2.addRoutes(app);
  sessionV2.addRoutes(app);

  app.all('/*', findUser)

  rss.addRoutes(app);
  bookmarklet.addRoutes(app);

  usersV1.addRoutes(app);
  groupsV1.addRoutes(app);
  postsV1.addRoutes(app);
  commentsV1.addRoutes(app);
  timelineV1.addRoutes(app);
  searchV1.addRoutes(app);
  tagsV1.addRoutes(app);
  statsV1.addRoutes(app);
  usersV2.addRoutes(app);
  groupsV2.addRoutes(app);
  postsV2.addRoutes(app);
  commentsV2.addRoutes(app);
  timelineV2.addRoutes(app);
  searchV2.addRoutes(app);
  tagsV2.addRoutes(app);
  statsV2.addRoutes(app);
};
