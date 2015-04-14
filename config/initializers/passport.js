"use strict";

var LocalStrategy = require('passport-local').Strategy
  , models = require('../../app/models')
  , exceptions = require('../../app/support/exceptions')

exports.init = function(passport) {
  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, function(username, clearPassword, done) {
    models.User.findByUsername(username)
      .then(function(user) {
        if (!user)
          return done(null, false, { message: 'Incorrect username.'})

        user.validPassword(clearPassword)
          .then(function(valid) {
            if (valid)
              return done(null, user)
            else
              return done(null, false, { message: 'Incorrect password.'})
          })
      })
      .catch(function(e) { done(e, false) })
  }))
}

