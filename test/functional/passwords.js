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

    it('should require email', async () => {
      let response = await funcTestHelper.sendResetPassword('')
      response.status.should.equal(200)

      let data = await response.json()
      data.should.have.property('err')
      data.err.should.eql('Email cannot be blank')
    })

    it('should generate resetToken by original email of user', async () => {
      let response = await funcTestHelper.sendResetPassword(oldEmail)
      response.status.should.equal(200)

      let data = await response.json()
      data.should.have.property('message')
      data.message.should.eql('We will send a password reset link to ' + oldEmail + ' in a moment')
    })

    it('should generate resetToken by new email of user', async () => {
      let email = "luna@example.com"

      await funcTestHelper.updateUserAsync(context, { email })

      let errResponse = await funcTestHelper.sendResetPassword(oldEmail)
      errResponse.status.should.equal(404)

      let response = await funcTestHelper.sendResetPassword(email)
      response.status.should.equal(200, `failed to reset password for ${email} email`)

      let data = await response.json()
      data.should.have.property('message')
      data.message.should.eql('We will send a password reset link to ' + email + ' in a moment')
    })
  })

  describe('#update()', function() {
    var context = {}
      , email = "luna@example.com"

    beforeEach(funcTestHelper.createUserCtx(context, 'Luna', 'password'))
    beforeEach(function(done) { funcTestHelper.updateUserCtx(context, { email: email })(done) })
    beforeEach(async () => { await funcTestHelper.sendResetPassword(email) })

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
