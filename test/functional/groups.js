var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')
  , funcTestHelper = require('./functional_test_helper')
  , mkdirp = require('mkdirp')
  , config = require('../../config/config').load()

describe("GroupsController", function() {
  beforeEach(funcTestHelper.flushDb())

  describe("#create()", function() {
    var context = {}

    beforeEach(funcTestHelper.createUserCtx(context, 'Luna', 'password'))

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
              authToken: context.authToken })
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

    it('should create a private group', function(done) {
      var userName = 'pepyatka-dev';
      var screenName = 'Pepyatka Developers';
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: userName, screenName: screenName, isPrivate: '1'},
            authToken: context.authToken })
          .end(function(err, res) {
            res.body.should.not.be.empty
            res.body.should.have.property('groups')
            res.body.groups.isPrivate.should.eql('1')
            done()
          })
    })

    it('should not create a group if a user with that name already exists', function(done) {
      var userName = 'Luna';
      var screenName = 'Pepyatka Developers';
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: userName, screenName: screenName},
            authToken: context.authToken })
          .end(function(err, res) {
            err.should.not.be.empty
            err.status.should.eql(422)
            done()
          })
    })

    it('should not create a group with slash in its name', function(done) {
      var userName = 'Lu/na';
      var screenName = 'Pepyatka Developers';
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: userName, screenName: screenName},
            authToken: context.authToken })
          .end(function(err, res) {
            err.should.not.be.empty
            err.status.should.eql(422)
            err.response.error.should.have.property('text')
            JSON.parse(err.response.error.text).err.should.eql('Invalid')
            done()
          })
    })

    it('should not create a group with an empty username', function(done) {
      var userName = '';
      var screenName = '';
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: userName, screenName: screenName},
            authToken: context.authToken })
          .end(function(err, res) {
            err.should.not.be.empty
            err.status.should.eql(422)
            err.response.error.should.have.property('text')
            JSON.parse(err.response.error.text).err.should.eql('Invalid')
            done()
          })
    })

    it('should add the creating user as the administrator', function(done) {
      var userName = 'pepyatka-dev';
      var screenName = 'Pepyatka Developers';
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: userName, screenName: screenName},
            authToken: context.authToken })
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
            authToken: context.authToken })
          .end(function(err, res) {
            var newGroupId = res.body.groups.id
            request
                .get(app.config.host + '/v1/users/Luna/subscriptions')
                .query({ authToken: context.authToken })
                .end(function(err, res) {
                  res.status.should.not.eql(404)
                  res.status.should.not.eql(422)
                  res.body.should.not.be.empty
                  res.body.should.have.property('subscribers')
                  res.body.should.have.property('subscriptions')
                  var subIds = res.body.subscriptions.map(function(sub) { return sub.user })
                  subIds.should.contain(newGroupId)
                  var users = res.body.subscribers
                  users.length.should.eql(1)
                  users[0].type.should.eql("group")
                  done()
                })
          })
    })
  })

  describe('#admin', function() {
    var adminContext = {}
      , nonAdminContext = {}

    beforeEach(funcTestHelper.createUserCtx(adminContext, 'Luna', 'password'))
    beforeEach(funcTestHelper.createUserCtx(nonAdminContext, 'yole', 'wordpass'))

    beforeEach(function(done) {
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: 'pepyatka-dev', screenName: 'Pepyatka Developers'},
            authToken: adminContext.authToken })
          .end(function(err, res) {
            done()
          })

    })

    it('should reject unauthenticated users', function(done) {
      request
          .post(app.config.host + '/v1/groups/pepyatka-dev/subscribers/yole/admin')
          .end(function(err, res) {
            err.should.not.be.empty
            err.status.should.eql(403)
            done()
          })
    })

    it('should reject nonexisting group', function(done) {
      request
          .post(app.config.host + '/v1/groups/foobar/subscribers/yole/admin')
          .end(function(err, res) {
            err.should.not.be.empty
            err.status.should.eql(404)
            done()
          })
    })
    it('should allow an administrator to add another administrator', function(done) {
      request
          .post(app.config.host + '/v1/groups/pepyatka-dev/subscribers/yole/admin')
          .send({authToken: adminContext.authToken })
          .end(function(err, res) {
            res.status.should.eql(200)
            done()
          })
    })
  })

  describe('#update', function() {
    var context = {}
      , group

    beforeEach(funcTestHelper.createUserCtx(context, 'Luna', 'password'))

    beforeEach(function(done) {
      request
        .post(app.config.host + '/v1/groups')
        .send({ group: {username: 'pepyatka-dev', screenName: 'Pepyatka Developers'},
                authToken: context.authToken
              })
        .end(function(err, res) {
          group = res.body.groups
          done()
        })
    })

    it('should update group settings', function(done) {
      var screenName = 'mokum-dev'

      request
        .post(app.config.host + '/v1/users/' + group.id)
        .send({ authToken: context.authToken,
                user: { screenName: screenName },
                '_method': 'put' })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('groups')
          res.body.groups.should.have.property('id')
          res.body.groups.should.have.property('screenName')
          res.body.groups.screenName.should.eql(screenName)
          done()
        })
    })
  })

  describe('#unadmin', function() {
    var adminContext = {}
      , nonAdminContext = {}

    beforeEach(funcTestHelper.createUserCtx(adminContext, 'Luna', 'password'))
    beforeEach(funcTestHelper.createUserCtx(nonAdminContext, 'yole', 'wordpass'))

    beforeEach(function(done) {
      request
          .post(app.config.host + '/v1/groups')
          .send({ group: {username: 'pepyatka-dev', screenName: 'Pepyatka Developers'},
            authToken: adminContext.authToken })
          .end(function(err, res) {
            done()
          })

    })

    beforeEach(function(done) {
      request
          .post(app.config.host + '/v1/groups/pepyatka-dev/subscribers/yole/admin')
          .send({ authToken: adminContext.authToken })
          .end(function(err, res) {
            done()
          })
    })

    it('should allow an administrator to remove another administrator', function(done) {
      request
          .post(app.config.host + '/v1/groups/pepyatka-dev/subscribers/yole/unadmin')
          .send({ authToken: adminContext.authToken })
          .end(function(err, res) {
            res.status.should.eql(200)
            done()
          })
    })
  })

  describe('#updateProfilePicture', function() {
    var context = {}

    beforeEach(funcTestHelper.createUserCtx(context, 'Luna', 'password'))

    beforeEach(function(done){
      mkdirp.sync(config.profilePictures.fsDir)
      done()
    })

    beforeEach(function(done) {
      request
        .post(app.config.host + '/v1/groups')
        .send({ group: {username: 'pepyatka-dev', screenName: 'Pepyatka Developers'},
          authToken: context.authToken })
        .end(function(err, res) {
          done()
        })
    })

    it('should update the profile picture', function(done) {
      request
        .post(app.config.host + '/v1/groups/pepyatka-dev/updateProfilePicture')
        .set('X-Authentication-Token', context.authToken)
        .attach('file', 'test/fixtures/default-userpic-75.gif')
        .end(function(err, res) {
          res.status.should.eql(200)
          res.body.should.not.be.empty
          request
            .get(app.config.host + '/v1/users/pepyatka-dev')
            .query({ authToken: context.authToken })
            .end(function(err, res) {
              res.should.not.be.empty
              res.body.users.profilePictureLargeUrl.should.not.be.empty
              done()
            })
        })
    })
  })
})
