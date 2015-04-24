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
        if (!user) {
          // db inconsistency. got id, but didn't find object
          return done({ message: "We could not find the nickname you provided." })
        }

        user.validPassword(clearPassword)
          .then(function(valid) {
            if (valid)
              return done(null, user)
            else
              return done({ message: "The password you provided does not match the password in our system." })
          })
      })
      .catch(function(e) {
        // didn't find id by username
        return done({ message: "We could not find the nickname you provided." })
      })
  }))
}

