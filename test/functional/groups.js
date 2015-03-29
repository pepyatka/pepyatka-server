var request = require('superagent')
    , app = require('../../index')
    , models = require('../../app/models')
    , funcTestHelper = require('./functional_test_helper')

describe("GroupsController", function() {
  beforeEach(function (done) {
    $database.flushdbAsync()
        .then(function () {
          done()
        })
  })

  describe("#create()", function() {
    var authToken

    beforeEach(funcTestHelper.createUser('Luna', 'password', function(token) {
      authToken = token
    }))

    it('should reject unauthenticated users', function(done) {
      request
          .post(app.config.host + '/v1/groups')
          .end(function(err, res) {
            err.should.not.be.empty
            err.status.should.eql(401)
            done()
          })
    })

    it('should create a group', function(done) {
      var userName = 'pepyatka-dev';
      var screenName = 'Pepyatka Developers';
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: userName, screenName: screenName},
              authToken: authToken })
          .end(function(err, res) {
            res.body.should.not.be.empty
            res.body.should.have.property('groups')
            res.body.groups.should.have.property('username')
            res.body.groups.should.have.property('screenName')
            res.body.groups.username.should.eql(userName)
            res.body.groups.screenName.should.eql(screenName)
            done()
          })
    })

    it('should not create a group if a user with that name already exists', function(done) {
      var userName = 'Luna';
      var screenName = 'Pepyatka Developers';
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: userName, screenName: screenName},
            authToken: authToken })
          .end(function(err, res) {
            err.should.not.be.empty
            err.status.should.eql(401)
            done()
          })
    })

    it('should add the creating user as the administrator', function(done) {
      var userName = 'Luna';
      var screenName = 'Pepyatka Developers';
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: userName, screenName: screenName},
            authToken: authToken })
          .end(function(err, res) {
            err.should.not.be.empty
            err.status.should.eql(401)
            done()
          })
    })
  })
})


