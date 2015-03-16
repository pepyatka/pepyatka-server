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
})
