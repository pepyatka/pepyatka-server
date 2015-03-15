"use strict";

var LocalStrategy = require('passport-local').Strategy
  , models = require('../../app/models')

exports.init = function(passport) {
  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, function(username, clearPassword, done) {
    models.User.findByUsername(username)
      .then(function(user) {
        if (!user)
          return done(null, false, { message: 'Incorrect username.'})

        if (!user.validPassword(clearPassword))
          return done(null, false, { message: 'Incorrect password.'})

        return done(null, user)
      })
  }))
}

