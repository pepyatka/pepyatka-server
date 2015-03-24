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
              done()
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
              res.body.timelines.should.have.property('posts')
              res.body.timelines.posts.length.should.eql(0)
              done()
            })
        })
    })

    it('should not unsubscribe to herself', function(done) {
      request
        .post(app.config.host + '/v1/users/' + userA.username + '/unsubscribe')
        .send({ authToken: authTokenA })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(422)
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
})
