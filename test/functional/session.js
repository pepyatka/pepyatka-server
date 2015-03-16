var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')

describe("SessionController", function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe("#create()", function() {
    var user

    beforeEach(function(done) {
      user = new models.User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(newUser) { done() })
    })

    it("should sign in with a valid user", function(done) {
      request
        .post(app.config.host + '/v1/session')
        .send({ username: user.username, password: user.password })
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
        .send({ username: 'username', password: user.password })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.err.should.not.be.empty
          done()
        })
    })
  })
})
