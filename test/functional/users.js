var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')

describe("UsersController", function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe("#create()", function() {
    it('should create a valid user', function(done) {
      var user = {
        username: 'Luna',
        password: 'password'
      }

      request
        .post(app.config.host + '/v1/users')
        .send({ username: user.username, password: user.password })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('users')
          res.body.users.should.have.property('id')
          res.body.users.should.have.property('username')
          res.body.users.username.should.eql(user.username.toLowerCase())
          done()
        })
    })

    it('should not create an invalid user', function(done) {
      var user = {
        username: 'Luna',
        password: ''
      }

      request
        .post(app.config.host + '/v1/users')
        .send({ username: user.username, password: user.password })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.err.should.not.be.empty
          done()
        })
    })
  })

  describe("#whoami()", function() {
    var authToken
    var user = {
      username: 'Luna',
      password: 'password'
    }

    beforeEach(function(done) {
      request
        .post(app.config.host + '/v1/users')
        .send({ username: user.username, password: user.password })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('authToken')
          authToken = res.body.authToken
          done()
        })
    })

    it('should return current user for a valid user', function(done) {
      request
        .get(app.config.host + '/v1/users/whoami')
        .query({ authToken: authToken })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('users')
          res.body.users.should.have.property('id')
          res.body.users.should.have.property('username')
          res.body.users.username.should.eql(user.username.toLowerCase())
          done()
        })
    })

    it('should not return user for an invalid user', function(done) {
      request
        .get(app.config.host + '/v1/users/whoami')
        .query({ authToken: 'token' })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)
          done()
        })
    })
  })
})
