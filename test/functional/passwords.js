var request = require('superagent')
    , app = require('../../index')
    , models = require('../../app/models')
    , funcTestHelper = require('./functional_test_helper')

describe("PasswordsController", function() {
  beforeEach(funcTestHelper.flushDb())

  describe("#create()", function() {
    var authToken
      , luna

    beforeEach(funcTestHelper.createUser('Luna', 'password', function(token, luna) {
      authToken = token
      user = luna
    }))

    it('should generate resetToken by email', function(done) {
      var email = "luna@example.com"

      request
        .post(app.config.host + '/v1/users/' + user.id)
        .send({ authToken: authToken,
                user: { email: email },
                '_method': 'put' })
        .end(function(err, res) {
          request
            .post(app.config.host + '/v1/passwords')
            .send({ email: email })
            .end(function(err, res) {
              res.body.should.not.be.empty
              res.body.should.have.property('message')
              res.body.message.should.eql('We will send a password reset link to ' + email + ' in a moment')
              done()
            })
        })
    })

    it('should require email', function(done) {
      var email = "luna@example.com"

      request
        .post(app.config.host + '/v1/users/' + user.id)
        .send({ authToken: authToken,
                user: { email: email },
                '_method': 'put' })
        .end(function(err, res) {
          request
            .post(app.config.host + '/v1/passwords')
            .end(function(err, res) {
              res.body.should.not.be.empty
              res.body.should.have.property('err')
              res.body.err.should.eql('Email cannot be blank')
              done()
            })
        })
    })
  })

  describe('#update()', function() {
    var authToken
      , luna

    beforeEach(funcTestHelper.createUser('Luna', 'password', function(token, luna) {
      authToken = token
      user = luna
    }))

    beforeEach(function(done) {
      var email = "luna@example.com"

      request
        .post(app.config.host + '/v1/users/' + user.id)
        .send({ authToken: authToken,
                user: { email: email },
                '_method': 'put' })
        .end(function(err, res) {
          request
            .post(app.config.host + '/v1/passwords')
            .send({ email: email })
            .end(function(err, res) {
              done()
            })
        })
    })

    it('should not reset password by invalid resetToken', function(done) {
      request
        .post(app.config.host + '/v1/passwords/token')
        .send({ '_method': 'put' })
        .end(function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('err')
          res.body.err.should.eql('Record not found')
          done()
        })
    })
  })
})
