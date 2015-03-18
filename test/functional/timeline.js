var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')

describe("TimelinesController", function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe("#home()", function() {
    var authToken

    beforeEach(function(done) {
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
          res.body.should.have.property('authToken')
          authToken = res.body.authToken

          done()
        })
    })

    it('should return empty River Of News', function(done) {
      request
        .get(app.config.host + '/v1/timelines/home')
        .query({ authToken: authToken })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('timelines')
          res.body.timelines.should.have.property('name')
          res.body.timelines.name.should.eql('RiverOfNews')
          res.body.timelines.should.have.property('posts')
          res.body.timelines.posts.length.should.eql(0)
          res.body.should.have.property('posts')
          res.body.posts.length.should.eql(0)
          done()
        })
    })

    it('should not return River Of News for unauthenticated user', function(done) {
      request
        .get(app.config.host + '/v1/timelines/home')
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)
          done()
        })
    })

    it('should return River of News with one post', function(done) {
      done()
    })
  })
})
