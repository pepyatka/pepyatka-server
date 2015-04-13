var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')
  , funcTestHelper = require('./functional_test_helper')

describe("SessionController", function() {
  beforeEach(funcTestHelper.flushDb())

  describe("#create()", function() {
    var user, user_data;

    beforeEach(function(done) {
      user_data = {
        username: 'Luna',
        password: 'password'
      };
      user = new models.User(user_data)

      user.create()
        .then(function(newUser) { done() })
    })

    it("should sign in with a valid user", function(done) {
      request
        .post(app.config.host + '/v1/session')
        .send({ username: user_data.username, password: user_data.password })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('users')
          res.body.users.should.have.property('id')
          res.body.users.id.should.eql(user.id)
          done()
        })
    })

    it("should not sign in with an invalid user", function(done) {
      request
        .post(app.config.host + '/v1/session')
        .send({ username: 'username', password: user_data.password })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.err.should.not.be.empty
          done()
        })
    })
  })
})
