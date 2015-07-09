var request = require('superagent')
    , app = require('../../index')
    , models = require('../../app/models')
    , funcTestHelper = require('./functional_test_helper')

describe("PasswordsController", function() {
  beforeEach(funcTestHelper.flushDb())

  describe("#create()", function() {
    var context = {}
      , oldEmail = 'test@example.com'

    beforeEach(funcTestHelper.createUserCtx(context, 'Luna', 'password', { 'email': oldEmail }))

    it('should generate resetToken by email', function(done) {
      var email = "luna@example.com"

      funcTestHelper.updateUserCtx(context, { email: email })(function(err, res) {
        funcTestHelper.sendResetPassword(email)(function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('message')
          res.body.message.should.eql('We will send a password reset link to ' + email + ' in a moment')
          done()
        })
      })
    })

    it('should generate resetToken by email for a new user', function(done) {
      funcTestHelper.sendResetPassword(oldEmail)(function(err, res) {
        res.body.should.not.be.empty
        res.body.should.have.property('message')
        res.body.message.should.eql('We will send a password reset link to ' + oldEmail + ' in a moment')
        done()
      })
    })

    it('should require email', function(done) {
      var email = "luna@example.com"

      funcTestHelper.updateUserCtx(context, { email: email })(function(err, res) {
        funcTestHelper.sendResetPassword('')(function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('err')
          res.body.err.should.eql('Email cannot be blank')
          done()
        })
      })
    })
  })

  describe('#update()', function() {
    var context = {}
      , email = "luna@example.com"

    beforeEach(funcTestHelper.createUserCtx(context, 'Luna', 'password'))
    beforeEach(function(done) { funcTestHelper.updateUserCtx(context, { email: email })(done) })
    beforeEach(function(done) { funcTestHelper.sendResetPassword(email)(done) })

    it('should not reset password by invalid resetToken', function(done) {
      funcTestHelper.resetPassword('token')(function(err, res) {
        res.body.should.not.be.empty
        res.body.should.have.property('err')
        res.body.err.should.eql('Record not found')
        done()
      })
    })
  })
})
