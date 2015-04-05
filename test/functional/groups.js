var request = require('superagent')
    , app = require('../../index')
    , models = require('../../app/models')
    , funcTestHelper = require('./functional_test_helper')

describe("GroupsController", function() {
  beforeEach(funcTestHelper.flushDb())

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
            res.body.groups.should.have.property('postsTimelineId')
            res.body.groups.username.should.eql(userName)
            res.body.groups.screenName.should.eql(screenName)
            done()
          })
    })

    it('should create a private group', function(done) {
      var userName = 'pepyatka-dev';
      var screenName = 'Pepyatka Developers';
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: userName, screenName: screenName, visibility: 'private'},
            authToken: authToken })
          .end(function(err, res) {
            res.body.should.not.be.empty
            res.body.should.have.property('groups')
            res.body.groups.visibility.should.eql('private')
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
      var userName = 'pepyatka-dev';
      var screenName = 'Pepyatka Developers';
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: userName, screenName: screenName},
            authToken: authToken })
          .end(function(err, res) {
            // TODO[yole] check that the user is an administrator
            done()
          })
    })

    it('should subscribe the creating user', function(done) {
      var userName = 'pepyatka-dev';
      var screenName = 'Pepyatka Developers';
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: userName, screenName: screenName},
            authToken: authToken })
          .end(function(err, res) {
            var newGroupId = res.body.groups.id
            request
                .get(app.config.host + '/v1/users/Luna/subscriptions')
                .query({authToken: authToken})
                .end(function(err, res) {
                  var subIds = res.body.subscriptions.map(function(sub) { return sub.user })
                  subIds.should.contain(newGroupId)
                  var users = res.body.users
                  users.length.should.eql(1)
                  users[0].type.should.eql("group")
                  done()
                })
          })
    })
  })

  describe('#admin', function() {
    var authTokenAdmin, authTokenNonAdmin

    beforeEach(funcTestHelper.createUser('Luna', 'password', function(token) {
      authTokenAdmin = token
    }))

    beforeEach(funcTestHelper.createUser('yole', 'wordpass', function(token) {
      authTokenNonAdmin = token
    }))

    beforeEach(function(done) {
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: 'pepyatka-dev', screenName: 'Pepyatka Developers'},
            authToken: authTokenAdmin })
          .end(function(err, res) {
            done()
          })

    })

    it('should reject unauthenticated users', function(done) {
      request
          .post(app.config.host + '/v1/groups/pepyatka-dev/subscribers/yole/admin')
          .end(function(err, res) {
            err.should.not.be.empty
            err.status.should.eql(401)
            done()
          })
    })

    it('should reject nonexisting group', function(done) {
      request
          .post(app.config.host + '/v1/groups/foobar/subscribers/yole/admin')
          .end(function(err, res) {
            err.should.not.be.empty
            err.status.should.eql(401)
            done()
          })
    })
    it('should allow an administrator to add another administrator', function(done) {
      request
          .post(app.config.host + '/v1/groups/pepyatka-dev/subscribers/yole/admin')
          .send({authToken: authTokenAdmin})
          .end(function(err, res) {
            res.status.should.eql(200)
            done()
          })
    })
  })

  describe('#unadmin', function() {
    var authTokenAdmin, authTokenNonAdmin

    beforeEach(funcTestHelper.createUser('Luna', 'password', function(token) {
      authTokenAdmin = token
    }))

    beforeEach(funcTestHelper.createUser('yole', 'wordpass', function(token) {
      authTokenNonAdmin = token
    }))

    beforeEach(function(done) {
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: 'pepyatka-dev', screenName: 'Pepyatka Developers'},
            authToken: authTokenAdmin })
          .end(function(err, res) {
            done()
          })

    })

    beforeEach(function(done) {
      request
          .post(app.config.host + '/v1/groups/pepyatka-dev/subscribers/yole/admin')
          .send({authToken: authTokenAdmin})
          .end(function(err, res) {
            done()
          })
    })

    it('should allow an administrator to remove another administrator', function(done) {
      request
          .post(app.config.host + '/v1/groups/pepyatka-dev/subscribers/yole/unadmin')
          .send({authToken: authTokenAdmin})
          .end(function(err, res) {
            res.status.should.eql(200)
            done()
          })
    })
  })
})


