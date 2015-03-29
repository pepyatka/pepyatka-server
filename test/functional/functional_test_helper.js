"use strict";

var request = require('superagent')
    , app = require('../../index')

exports.createUser = function(username, password, callback) {
  return function(done) {
    var user = {
      username: username,
      password: password
    }

    request
        .post(app.config.host + '/v1/users')
        .send({ username: user.username, password: user.password })
        .end(function(err, res) {
          if (callback) {
            callback(res.body.authToken)
          }
          done()
        })

  }
}