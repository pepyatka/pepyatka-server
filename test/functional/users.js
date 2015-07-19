var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')
  , async = require('async')
  , funcTestHelper = require('./functional_test_helper')
  , mkdirp = require('mkdirp')
  , config = require('../../config/config').load()
  , _ = require('lodash')

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
    it('should return list of subscribers')
  })

  describe('#subscribe()', function() {
    var lunaContext = {}
      , marsContext = {}

    beforeEach(funcTestHelper.createUserCtx(lunaContext, 'Luna', 'password'))
    beforeEach(funcTestHelper.createUserCtx(marsContext, 'Mars', 'password'))
    beforeEach(function(done) { funcTestHelper.createPost(lunaContext, 'Post body')(done) })

    it('should submit a post to friends river of news', function(done) {
      var body = "Post body"

      request
        .post(app.config.host + '/v1/users/' + lunaContext.username + '/subscribe')
        .send({ authToken: marsContext.authToken })
        .end(function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('users')
          res.body.users.should.have.property('username')
          res.body.users.username.should.eql(marsContext.username.toLowerCase())

          funcTestHelper.createPost(lunaContext, body)(function(err, res) {
            request
              .get(app.config.host + '/v1/timelines/home')
              .query({ authToken: marsContext.authToken })
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
        .post(app.config.host + '/v1/users/' + lunaContext.username + '/subscribe')
        .send({ authToken: marsContext.authToken })
        .end(function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('users')
          res.body.users.should.have.property('username')
          res.body.users.username.should.eql(marsContext.username.toLowerCase())

          request
            .get(app.config.host + '/v1/timelines/home')
            .query({ authToken: marsContext.authToken })
            .end(function(err, res) {
              res.body.should.not.be.empty
              res.body.should.have.property('timelines')
              res.body.timelines.should.have.property('posts')
              res.body.timelines.posts.length.should.eql(1)

              request
                .post(app.config.host + '/v1/users/' + lunaContext.username + '/subscribe')
                .send({ authToken: marsContext.authToken })
                .end(function(err, res) {
                  err.should.not.be.empty
                  err.status.should.eql(403)
                  err.response.error.should.have.property('text')
                  JSON.parse(err.response.error.text).err.should.eql("You are already subscribed to that user")

                  done()
                })
            })
        })
    })

    it('should not subscribe to herself', function(done) {
      request
        .post(app.config.host + '/v1/users/' + lunaContext.username + '/subscribe')
        .send({ authToken: lunaContext.authToken })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(422)
          done()
        })
    })

    it('should require valid user to subscribe to another user', function(done) {
      request
        .post(app.config.host + '/v1/users/' + lunaContext.username + '/subscribe')
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
    describe('single-user tests', function() {
      "use strict";

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

      var invalid = [
        '', 'a', 'aa', 'aaaaaaaaaaaaaaaaaaaaaaaaaa',
        '\u4E9C\u4E9C',  // 2 han ideographs
        '\u0928\u093F\u0928\u093F'  // Devanagari syllable "ni" (repeated 2 times)
      ]

      _.forEach(invalid, function(screenName) {
        it('should not allow invalid screen-name: ' + screenName, function(done) {
          request
            .post(app.config.host + '/v1/users/' + user.id)
            .send({ authToken: authToken,
              user: { screenName: screenName },
              '_method': 'put' })
            .end(function(err, res) {
              err.should.not.be.empty
              err.status.should.eql(422)
              done()
            })
        })
      })

      var valid = [
        'aaa', 'aaaaaaaaaaaaaaaaaaaaaaaaa',
        '\u4E9C\u4E9C\u4E9C',
        '\u0928\u093F\u0928\u093F\u0928\u093F',
        // extreme grapheme example follows
        'Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍'
        // extreme grapheme example done
      ]

      _.forEach(valid, function(screenName) {
        it('should allow valid screen-name: ' + screenName, function(done) {
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
      })
    })

    describe('double-user tests', function() {
      "use strict";

      var lunaContext = {}
      var marsContext = {}

      beforeEach(funcTestHelper.createUserCtx(lunaContext, 'luna', 'luna', {email: "luna@example.org"}))
      beforeEach(funcTestHelper.createUserCtx(marsContext, 'mars', 'mars', {email: "mars@example.org"}))

      it('should not let user use email, which is used by other user', function(done) {
        funcTestHelper.updateUserCtx(lunaContext, {email: marsContext.attributes.email})(function(err, response) {
          $should.exist(err)
          err.status.should.eql(422)
          err.response.error.should.have.property('text')
          JSON.parse(err.response.error.text).err.should.eql('Invalid email')
          done()
        })
      })

      it('should let user to use email, which was used by other user, but not used anymore', function(done) {
        funcTestHelper.updateUserCtx(marsContext, {email: 'other@example.org'})(function (err, response) {
          $should.not.exist(err)

          funcTestHelper.updateUserCtx(lunaContext, {email: marsContext.attributes.email})(function (err2, response2) {
            $should.not.exist(err2)
            done()
          })
        })
      })

      it('should let user "reset" password using newly set email', function(done) {
        funcTestHelper.updateUserCtx(marsContext, {email: 'other@example.org'})(function (err, res) {
          $should.not.exist(err)

          funcTestHelper.sendResetPassword(marsContext.attributes.email)(function(err2, res2) {
            $should.exist(err2)

            funcTestHelper.sendResetPassword('other@example.org')(function(err3, res3) {
              $should.not.exist(err3)
              $should.exist(res3)
              res3.body.message.should.eql('We will send a password reset link to other@example.org in a moment')
              done()
            })
          })
        })
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

    it('should report an error if the profile picture is not an image', function(done) {
      request
        .post(app.config.host + '/v1/users/updateProfilePicture')
        .set('X-Authentication-Token', authToken)
        .attach('file', 'README.md')
        .end(function(err, res) {
          res.status.should.eql(400)
          res.body.err.should.eql("Not an image file")
          done()
        })
    })
  })

  describe('#ban()', function() {
    // Zeus bans Mars, as usual
    var marsContext = {}
    var zeusContext = {}
    var username = 'zeus'
    var banUsername = 'mars'

    beforeEach(funcTestHelper.createUserCtx(marsContext, banUsername, 'pw'))
    beforeEach(funcTestHelper.createUserCtx(zeusContext, username, 'pw'))

    // Mars is subscribed to Zeus
    beforeEach(function(done) {
      request
        .post(app.config.host + '/v1/users/' + username + '/subscribe')
        .send({ authToken: marsContext.authToken })
        .end(function(err, res) {
          res.body.should.not.be.empty
          done()
        })
    })

    // Zeus bans Mars, Mars should become unsubscribed from Zeus.
    it('should unsubscribe the user', function(done) {
      request
        .get(app.config.host + '/v1/users/' + username + '/subscriptions')
        .query({ authToken: marsContext.authToken })
        .end(function(err, res) { // Mars has subcriptions to Zeus
          res.body.should.not.be.empty
          res.body.should.have.property('subscriptions')
          var types = ['Comments', 'Likes', 'Posts']
          async.reduce(res.body.subscriptions, true, function(memo, user, callback) {
            callback(null, memo && (types.indexOf(user.name) >= 0))
          }, function(err, contains) {
            contains.should.eql(true)
          })
          request
            .post(app.config.host + '/v1/users/' + banUsername + '/ban')
            .send({ authToken: zeusContext.authToken })
            .end(function(err, res) {
              res.body.should.not.be.empty
              request
                .get(app.config.host + '/v1/users/' + username + '/subscriptions')
                .query({ authToken: marsContext.authToken })
                .end(function(err, res) { // Mars now has NO subcriptions to Zeus
                  res.body.should.not.be.empty
                  res.body.should.have.property('subscriptions')
                  res.body.subscriptions.length.should.eql(0)
                  done()
                })
            })
        })
    })

    // Zeus writes a post, Mars comments, Zeus bans Mars and should see no comments
    it('should ban user comments', function(done) {
      var body = 'Post'
      funcTestHelper.createPost(zeusContext, body)(function(err, res) {
        res.body.should.not.be.empty
        var postId = res.body.posts.id
        funcTestHelper.createComment(body, postId, marsContext.authToken, function(err, res) {
          res.body.should.not.be.empty

          request
            .post(app.config.host + '/v1/users/' + banUsername + '/ban')
            .send({ authToken: zeusContext.authToken })
            .end(function(err, res) {
              res.body.should.not.be.empty
              funcTestHelper.getTimeline('/v1/timelines/home', zeusContext.authToken, function(err, res) {
                res.body.should.not.be.empty
                res.body.should.have.property('posts')
                res.body.posts.length.should.eql(1)
                var post = res.body.posts[0]
                post.should.not.have.property('comments')

                // Zeus should not see comments in single-post view either
                request
                  .get(app.config.host + '/v1/posts/' + postId)
                  .query({ authToken: zeusContext.authToken })
                  .end(function(err, res) {
                    res.body.should.not.be.empty
                    res.body.should.have.property('posts')
                    res.body.posts.should.not.have.property('comments')
                    done()
                  })
              })
            })
        })
      })
    })

    // Zeus writes a post, Mars likes it, Zeus bans Mars and should not see like
    it('should ban user likes', function(done) {
      funcTestHelper.createPostForTest(zeusContext, 'Post body', function(err, res) {
          res.body.should.not.be.empty

          request
            .post(app.config.host + '/v1/posts/' + zeusContext.post.id + '/like')
            .send({ authToken: marsContext.authToken })
            .end(function(err, res) {
              $should.not.exist(err)
              request
                .post(app.config.host + '/v1/users/' + banUsername + '/ban')
                .send({ authToken: zeusContext.authToken })
                .end(function(err, res) {
                  res.body.should.not.be.empty
                  funcTestHelper.getTimeline('/v1/timelines/home', zeusContext.authToken, function(err, res) {
                    res.body.should.not.be.empty
                    res.body.should.have.property('posts')
                    res.body.posts.length.should.eql(1)
                    var post = res.body.posts[0]
                    post.should.not.have.property('likes')

                    // Zeus should not see likes in single-post view either
                    request
                      .get(app.config.host + '/v1/posts/' + zeusContext.post.id)
                      .query({ authToken: zeusContext.authToken })
                      .end(function(err, res) {
                        res.body.should.not.be.empty
                        res.body.should.have.property('posts')
                        res.body.posts.should.not.have.property('likes')
                        done()
                      })
                  })
                })
            })
        })
    })

    // Mars writes a post, Zeus likes post, Zeus bans Mars and should not see the post any more
    it('should ban user posts', function(done) {
      funcTestHelper.createPostForTest(marsContext, 'Post body', function(err, res) {
        request
          .post(app.config.host + '/v1/posts/' + marsContext.post.id + '/like')
          .send({ authToken: zeusContext.authToken })
          .end(function(err, res) {
            // Now Zeus should see this post in his timeline
            funcTestHelper.getTimeline('/v1/timelines/home', zeusContext.authToken, function(err, res) {
              res.body.should.not.be.empty
              res.body.should.have.property('posts')
              res.body.posts.length.should.eql(1)

              request
                .post(app.config.host + '/v1/users/' + banUsername + '/ban')
                .send({ authToken: zeusContext.authToken })
                .end(function(err, res) {
                  res.body.should.not.be.empty
                  funcTestHelper.getTimeline('/v1/timelines/home', zeusContext.authToken, function(err, res) {
                    res.body.should.not.be.empty
                    res.body.should.not.have.property('posts')
                    done()
                  })
                })
            })
        })
      })
    })

    // Zeus writes a post, Zeus bans Mars, Mars should not see Zeus post any more
    it('should completely disallow to see banning user posts', function(done) {
      funcTestHelper.createPostForTest(zeusContext, 'Post body', function(err, res) {
        // Mars sees the post because he's subscribed to Zeus
        funcTestHelper.getTimeline('/v1/timelines/home', marsContext.authToken, function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('posts')
          res.body.posts.length.should.eql(1)

          request
            .post(app.config.host + '/v1/users/' + banUsername + '/ban')
            .send({ authToken: zeusContext.authToken })
            .end(function(err, res) {
              res.body.should.not.be.empty
              // Now Mars doesn't see post in his timeline
              funcTestHelper.getTimeline('/v1/timelines/home', marsContext.authToken, function(err, res) {
                res.body.should.not.be.empty
                res.body.should.not.have.property('posts')

                // Mars should not see the post in single-post view either
                request
                  .get(app.config.host + '/v1/posts/' + zeusContext.post.id)
                  .query({ authToken: marsContext.authToken })
                  .end(function(err, res) {
                    err.should.not.be.empty
                    err.status.should.eql(403)
                    err.response.error.should.have.property('text')
                    JSON.parse(err.response.error.text).err.should.eql("This user has prevented you from seeing their posts")
                    done()
                  })
              })
            })
        })
      })
    })

    // Zeus bans Mars and Mars could not subscribe again any more
    it('should not let user resubscribe', function(done) {
      request
        .post(app.config.host + '/v1/users/' + banUsername + '/ban')
        .send({ authToken: zeusContext.authToken })
        .end(function(err, res) {
          res.body.should.not.be.empty

          request
            .post(app.config.host + '/v1/users/' + username + '/subscribe')
            .send({ authToken: marsContext.authToken })
            .end(function(err, res) {
              err.should.not.be.empty
              err.status.should.eql(403)
              err.response.error.should.have.property('text')
              JSON.parse(err.response.error.text).err.should.eql("This user prevented your from subscribing to them")
              done()
            })
        })
    })

    // Same fun inside groups
    describe('in groups', function() {
      var groupUserName = 'pepyatka-dev'

      // Mars creates a group, Mars posts to it...
      beforeEach(function(done) {
        request
          .post(app.config.host + '/v1/groups')
          .send({ group: { username: groupUserName },
                  authToken: marsContext.authToken })
          .end(function(err, res) {
            res.body.should.not.be.empty
            request
              .post(app.config.host + '/v1/posts')
              .send({ post: { body: 'post body' }, meta: { feeds: [groupUserName] },
                      authToken: marsContext.authToken })
              .end(function(err, res) {
                res.body.should.not.be.empty
                res.body.should.have.property('posts')
                res.body.posts.should.have.property('body')

                done()
              })
          })
      })

      // ... Zeus bans Mars and should no longer see the post in this group
      it('should ban user posts to group', function(done) {
        request
          .post(app.config.host + '/v1/users/' + banUsername + '/ban')
          .send({ authToken: zeusContext.authToken })
          .end(function(err, res) {
            res.body.should.not.be.empty
            funcTestHelper.getTimeline('/v1/timelines/' + groupUserName, zeusContext.authToken, function(err, res) {
              res.body.should.not.be.empty
              res.body.should.not.have.property('posts')

              done()
            })
          })
      })
    })
  })
})
