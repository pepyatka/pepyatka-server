var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')
  , async = require('async')
  , funcTestHelper = require('./functional_test_helper')
  , mkdirp = require('mkdirp')
  , config = require('../../config/config').load()

describe("UsersController", function() {
  beforeEach(funcTestHelper.flushDb())

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

    it('should create a valid user with email', function(done) {
      var user = {
        username: 'Luna',
        password: 'password',
        email: 'user@example.com'
      }

      request
        .post(app.config.host + '/v1/users')
        .send({ username: user.username, password: user.password, email: user.email })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('users')
          res.body.users.should.have.property('id')
          res.body.users.should.have.property('username')
          res.body.users.username.should.eql(user.username.toLowerCase())
          res.body.users.should.have.property('email')
          res.body.users.email.should.eql(user.email)
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

    it('should not create user with slash in her username', function(done) {
      var user = {
        username: 'Lu/na',
        password: 'password'
      }

      request
        .post(app.config.host + '/v1/users')
        .send({ username: user.username, password: user.password })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.err.should.not.be.empty
          res.body.err.should.eql('Invalid')
          done()
        })
    })

    it('should not create user without password', function(done) {
      var user = {
        username: 'Luna'
      }

      request
        .post(app.config.host + '/v1/users')
        .send({ username: user.username, password: user.password })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.err.should.not.be.empty
          res.body.err.should.eql('Password cannot be blank')
          done()
        })
    })

    it('should not create user with invalid email', function(done) {
      var user = {
        username: 'Luna',
        password: 'password',
        email: 'user2.example.com'
      }

      request
        .post(app.config.host + '/v1/users')
        .send({ username: user.username, password: user.password, email: user.email })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.err.should.not.be.empty
          err.response.error.should.have.property('text')
          JSON.parse(err.response.error.text).err.should.eql('Invalid')
          done()
        })
    })

    it('should not create user with empty password', function(done) {
      var user = {
        username: 'Luna',
        password: '',
      }

      request
        .post(app.config.host + '/v1/users')
        .send({ username: user.username, password: user.password, email: user.email })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.err.should.not.be.empty
          err.response.error.should.have.property('text')
          JSON.parse(err.response.error.text).err.should.eql('Password cannot be blank')
          done()
        })
    })

    it('should not create a user with a duplicate name', function(done) {
      var user = {
        username: 'Luna',
        password: 'password'
      }

      request
          .post(app.config.host + '/v1/users')
          .send({ username: user.username, password: user.password })
          .end(function(err, res) {
            request
                .post(app.config.host + '/v1/users')
                .send({ username: user.username, password: user.password })
                .end(function(err, res) {
                  res.should.not.be.empty
                  res.body.err.should.not.be.empty
                  err.response.error.should.have.property('text')
                  JSON.parse(err.response.error.text).err.should.eql('Already exists')
                  done()
                })
          })
    })
  })

  describe("#whoami()", function() {
    var authToken
    var user = {
      username: 'Luna',
      password: 'password'
    }

    beforeEach(function(done) {
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

    it('should return current user for a valid user', function(done) {
      request
        .get(app.config.host + '/v1/users/whoami')
        .query({ authToken: authToken })
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

    it('should not return user for an invalid user', function(done) {
      request
        .get(app.config.host + '/v1/users/whoami')
        .query({ authToken: 'token' })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)
          done()
        })
    })
  })

  describe('#subscribers()', function() {
    it('should return list of subscribers', function(done) {
      done()
    })
  })

  describe('#subscribe()', function() {
    var userA
      , userB
      , authTokenA
      , authTokenB

    beforeEach(function(done) {
      userA = {
        username: 'Luna',
        password: 'password'
      }

      userB = {
        username: 'Mars',
        password: 'password'
      }

      request
        .post(app.config.host + '/v1/users')
        .send({ username: userA.username, password: userA.password })
        .end(function(err, res) {
          authTokenA = res.body.authToken

          request
            .post(app.config.host + '/v1/users')
            .send({ username: userB.username, password: userB.password })
            .end(function(err, res) {
              authTokenB = res.body.authToken

              var body = 'Post body'

              request
                .post(app.config.host + '/v1/posts')
                .send({ post: { body: body }, authToken: authTokenA })
                .end(function(err, res) {
                  done()
                })
            })
        })
    })

    it('should submit a post to friends river of news', function(done) {
      var body = "Post body"

      request
        .post(app.config.host + '/v1/users/' + userA.username + '/subscribe')
        .send({ authToken: authTokenB })
        .end(function(err, res) {
          res.body.should.be.empty

          request
            .post(app.config.host + '/v1/posts')
            .send({ post: { body: body }, authToken: authTokenA })
            .end(function(err, res) {
              request
                .get(app.config.host + '/v1/timelines/home')
                .query({ authToken: authTokenB })
                .end(function(err, res) {
                  res.body.should.not.be.empty
                  res.body.should.have.property('timelines')
                  res.body.timelines.should.have.property('posts')
                  res.body.timelines.posts.length.should.eql(2)
                  done()
                })
            })
        })
    })

    it('should subscribe to a user', function(done) {
      request
        .post(app.config.host + '/v1/users/' + userA.username + '/subscribe')
        .send({ authToken: authTokenB })
        .end(function(err, res) {
          res.body.should.be.empty

          request
            .get(app.config.host + '/v1/timelines/home')
            .query({ authToken: authTokenB })
            .end(function(err, res) {
              res.body.should.not.be.empty
              res.body.should.have.property('timelines')
              res.body.timelines.should.have.property('posts')
              res.body.timelines.posts.length.should.eql(1)

              request
                .post(app.config.host + '/v1/users/' + userA.username + '/subscribe')
                .send({ authToken: authTokenB })
                .end(function(err, res) {
                  err.should.not.be.empty
                  err.status.should.eql(403)
                  err.response.error.should.have.property('text')
                  JSON.parse(err.response.error.text).err.should.eql("You already subscribed to that user")

                  done()
                })
            })
        })
    })

    it('should not subscribe to herself', function(done) {
      request
        .post(app.config.host + '/v1/users/' + userA.username + '/subscribe')
        .send({ authToken: authTokenA })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(422)
          done()
        })
    })

    it('should require valid user to subscribe to another user', function(done) {
      request
        .post(app.config.host + '/v1/users/' + userA.username + '/subscribe')
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)
          done()
        })
    })
  })

  describe('#subscribers()', function() {
    var userA
      , userB
      , authTokenA
      , authTokenB

    beforeEach(function(done) {
      userA = {
        username: 'Luna',
        password: 'password'
      }

      userB = {
        username: 'Mars',
        password: 'password'
      }

      request
        .post(app.config.host + '/v1/users')
        .send({ username: userA.username, password: userA.password })
        .end(function(err, res) {
          authTokenA = res.body.authToken

          request
            .post(app.config.host + '/v1/users')
            .send({ username: userB.username, password: userB.password })
            .end(function(err, res) {
              authTokenB = res.body.authToken

              var body = 'Post body'

              request
                .post(app.config.host + '/v1/posts')
                .send({ post: { body: body }, authToken: authTokenA })
                .end(function(err, res) {
                  request
                    .post(app.config.host + '/v1/users/' + userA.username + '/subscribe')
                    .send({ authToken: authTokenB })
                    .end(function(err, res) {
                      done()
                    })
                })
            })
        })
    })

    it('should return list of subscribers', function(done) {
      request
        .get(app.config.host + '/v1/users/' + userA.username + '/subscribers')
        .query({ authToken: authTokenB })
        .end(function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('subscribers')
          res.body.subscribers.should.not.be.empty
          res.body.subscribers.length.should.eql(1)
          res.body.subscribers[0].should.have.property('id')
          res.body.subscribers[0].username.should.eql(userB.username.toLowerCase())
          done()
        })
    })
  })

  describe('#unsubscribe()', function() {
    var userA
      , userB
      , authTokenA
      , authTokenB

    beforeEach(function(done) {
      userA = {
        username: 'Luna',
        password: 'password'
      }

      userB = {
        username: 'Mars',
        password: 'password'
      }

      request
        .post(app.config.host + '/v1/users')
        .send({ username: userA.username, password: userA.password })
        .end(function(err, res) {
          authTokenA = res.body.authToken

          request
            .post(app.config.host + '/v1/users')
            .send({ username: userB.username, password: userB.password })
            .end(function(err, res) {
              authTokenB = res.body.authToken

              var body = 'Post body'

              request
                .post(app.config.host + '/v1/posts')
                .send({ post: { body: body }, authToken: authTokenA })
                .end(function(err, res) {
                  request
                    .post(app.config.host + '/v1/users/' + userA.username + '/subscribe')
                    .send({ authToken: authTokenB })
                    .end(function(err, res) {
                      done()
                    })
                })
            })
        })
    })

    it('should unsubscribe to a user', function(done) {
      request
        .post(app.config.host + '/v1/users/' + userA.username + '/unsubscribe')
        .send({ authToken: authTokenB })
        .end(function(err, res) {
          request
            .get(app.config.host + '/v1/timelines/home')
            .query({ authToken: authTokenB })
            .end(function(err, res) {
              res.body.should.not.be.empty
              res.body.should.have.property('timelines')
              res.body.timelines.should.not.have.property('posts')

              request
                .post(app.config.host + '/v1/users/' + userA.username + '/unsubscribe')
                .send({ authToken: authTokenB })
                .end(function(err, res) {
                  err.should.not.be.empty
                  err.status.should.eql(403)
                  err.response.error.should.have.property('text')
                  JSON.parse(err.response.error.text).err.should.eql("You are not subscribed to that user")

                  done()
                })
            })
        })
    })

    it('should not unsubscribe to herself', function(done) {
      request
        .post(app.config.host + '/v1/users/' + userA.username + '/unsubscribe')
        .send({ authToken: authTokenA })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(403)
          done()
        })
    })

    it('should require valid user to unsubscribe to another user', function(done) {
      request
        .post(app.config.host + '/v1/users/' + userA.username + '/unsubscribe')
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)
          done()
        })
    })
  })

  describe('#subscriptions()', function() {
    var userA
      , userB
      , authTokenA
      , authTokenB

    beforeEach(function(done) {
      userA = {
        username: 'Luna',
        password: 'password'
      }

      userB = {
        username: 'Mars',
        password: 'password'
      }

      request
        .post(app.config.host + '/v1/users')
        .send({ username: userA.username, password: userA.password })
        .end(function(err, res) {
          authTokenA = res.body.authToken

          request
            .post(app.config.host + '/v1/users')
            .send({ username: userB.username, password: userB.password })
            .end(function(err, res) {
              authTokenB = res.body.authToken

              request
                .post(app.config.host + '/v1/users/' + userA.username + '/subscribe')
                .send({ authToken: authTokenB })
                .end(function(err, res) {
                  done()
                })
            })
        })
    })

    it('should return list of subscriptions', function(done) {
      request
        .get(app.config.host + '/v1/users/' + userB.username + '/subscriptions')
        .query({ authToken: authTokenB })
        .end(function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('subscriptions')
          var types = ['Comments', 'Likes', 'Posts']
          async.reduce(res.body.subscriptions, true, function(memo, user, callback) {
            callback(null, memo && (types.indexOf(user.name) >= 0))
          }, function(err, contains) {
            contains.should.eql(true)
            done()
          })
        })
    })
  })

  describe("#update()", function() {
    var authToken
      , user

    beforeEach(funcTestHelper.createUser('Luna', 'password', function(token, luna) {
      authToken = token
      user = luna
    }))

    it('should update current user', function(done) {
      var screenName = 'Mars'

      request
        .post(app.config.host + '/v1/users/' + user.id)
        .send({ authToken: authToken,
                user: { screenName: screenName },
                '_method': 'put' })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('users')
          res.body.users.should.have.property('id')
          res.body.users.should.have.property('screenName')
          res.body.users.screenName.should.eql(screenName)
          done()
        })
    })

    it('should require signed in user', function(done) {
      var screenName = 'Mars'

      request
        .post(app.config.host + '/v1/users/' + user.id)
        .send({ authToken: 'abc',
                user: { screenName: screenName },
                '_method': 'put' })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)
          done()
        })
    })
  })

  describe("#updatePassword()", function() {
    var authToken
      , user

    beforeEach(funcTestHelper.createUser('Luna', 'password', function(token, luna) {
      authToken = token
      user = luna
    }))

    it('should update current user password', function(done) {
      var screenName = 'Mars'
      var password = "drowssap"

      request
        .post(app.config.host + '/v1/users/updatePassword')
        .send({ authToken: authToken,
                currentPassword: user.password,
                password: password,
                passwordConfirmation: password,
                '_method': 'put' })
        .end(function(err, res) {
          (err === null).should.be.true

          request
            .post(app.config.host + '/v1/session')
            .send({ username: user.username, password: password })
            .end(function(err, res) {
              res.should.not.be.empty
              res.body.should.not.be.empty
              res.body.should.have.property('users')
              res.body.users.should.have.property('id')
              res.body.users.id.should.eql(user.id)
              done()
            })
        })
    })

    it('should not sign in with old password', function(done) {
      var screenName = 'Mars'
      var password = "drowssap"

      request
        .post(app.config.host + '/v1/users/updatePassword')
        .send({ authToken: authToken,
                currentPassword: user.password,
                password: password,
                passwordConfirmation: password,
                '_method': 'put' })
        .end(function(err, res) {
          (err === null).should.be.true

          request
            .post(app.config.host + '/v1/session')
            .send({ username: user.username, password: user.password })
            .end(function(err, res) {
              err.should.not.be.empty
              err.status.should.eql(401)
              done()
            })
        })
    })

    it('should not update password that does not match', function(done) {
      var screenName = 'Mars'
      var password = "drowssap"

      request
        .post(app.config.host + '/v1/users/updatePassword')
        .send({ authToken: authToken,
                currentPassword: user.password,
                password: password,
                passwordConfirmation: "abc",
                '_method': 'put' })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(422)
          err.response.error.should.have.property('text')
          JSON.parse(err.response.error.text).err.should.eql('Passwords do not match')
          done()
        })
    })

    it('should not update with blank password', function(done) {
      var screenName = 'Mars'
      var password = ""

      request
        .post(app.config.host + '/v1/users/updatePassword')
        .send({ authToken: authToken,
                currentPassword: user.password,
                password: password,
                passwordConfirmation: password,
                '_method': 'put' })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(422)
          err.response.error.should.have.property('text')
          JSON.parse(err.response.error.text).err.should.eql('Password cannot be blank')
          done()
        })
    })

    it('should not update with invalid password', function(done) {
      var screenName = 'Mars'
      var password = "drowssap"

      request
        .post(app.config.host + '/v1/users/updatePassword')
        .send({ authToken: authToken,
                currentPassword: "abc",
                password: password,
                passwordConfirmation: password,
                '_method': 'put' })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(422)
          err.response.error.should.have.property('text')
          JSON.parse(err.response.error.text).err.should.eql('Your old password is not valid')
          done()
        })
    })

    it('should require signed in user', function(done) {
      var screenName = 'Mars'

      request
        .post(app.config.host + '/v1/users/updatePassword')
        .send({ authToken: 'abc',
                user: { screenName: screenName },
                '_method': 'put' })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)
          done()
        })
    })
  })

  describe('#updateProfilePicture', function() {
    var authToken
      , user

    beforeEach(funcTestHelper.createUser('Luna', 'password', function (token, luna) {
      authToken = token
      user = luna
    }))

    beforeEach(function(done){
      mkdirp.sync(config.profilePictures.fsDir)
      done()
    })

    it('should update the profile picture', function(done) {
      request
        .post(app.config.host + '/v1/users/updateProfilePicture')
        .set('X-Authentication-Token', authToken)
        .attach('file', 'test/fixtures/default-userpic-75.gif')
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          request
            .get(app.config.host + '/v1/users/whoami')
            .query({ authToken: authToken })
            .end(function(err, res) {
              res.should.not.be.empty
              res.body.users.profilePictureLargeUrl.should.not.be.empty
              done()
            })
        })
    })
  })
})
