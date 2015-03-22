var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')

describe("PostsController", function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe('#create()', function() {
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

    it('should create a post with a valid user', function(done) {
      var body = 'Post body'

      request
        .post(app.config.host + '/v1/posts')
        .send({ post: { body: body }, authToken: authToken })
        .end(function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('posts')
          res.body.posts.should.have.property('body')
          res.body.posts.body.should.eql(body)

          done()
        })
    })

    it('should not create a post with an invalid user', function(done) {
      var body = 'Post body'

      request
        .post(app.config.host + '/v1/posts')
        .send({ post: { body: body }, authToken: 'token' })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)

          done()
        })
    })
  })

  describe('#like()', function() {
    var authToken
      , post

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

          var body = 'Post body'

          request
            .post(app.config.host + '/v1/posts')
            .send({ post: { body: body }, authToken: authToken })
            .end(function(err, res) {
              res.body.should.not.be.empty
              res.body.should.have.property('posts')
              res.body.posts.should.have.property('body')
              res.body.posts.body.should.eql(body)

              post = res.body.posts

              done()
            })
        })
    })

    it('should like post with a valid user', function(done) {
      request
        .post(app.config.host + '/v1/posts/' + post.id + '/like')
        .send({ authToken: authToken })
        .end(function(err, res) {
          res.body.should.be.empty
          $should.not.exist(err)

          done()
        })
    })

    it('should not like post with an invalid user', function(done) {
      request
        .post(app.config.host + '/v1/posts/' + post.id + '/like')
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)
          done()
        })
    })

    it('should not like invalid post', function(done) {
      request
        .post(app.config.host + '/v1/posts/:id/like')
        .send({ authToken: authToken })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(422)
          done()
        })
    })
  })

  describe('#unlike()', function() {
    var authToken
      , post

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

          var body = 'Post body'

          request
            .post(app.config.host + '/v1/posts')
            .send({ post: { body: body }, authToken: authToken })
            .end(function(err, res) {
              res.body.should.not.be.empty
              res.body.should.have.property('posts')
              res.body.posts.should.have.property('body')
              res.body.posts.body.should.eql(body)

              post = res.body.posts

              done()
            })
        })
    })

    it('should unlike post with a valid user', function(done) {
      request
        .post(app.config.host + '/v1/posts/' + post.id + '/unlike')
        .send({ authToken: authToken })
        .end(function(err, res) {
          res.body.should.be.empty
          $should.not.exist(err)

          done()
        })
    })

    it('should not unlike post with an invalid user', function(done) {
      request
        .post(app.config.host + '/v1/posts/' + post.id + '/unlike')
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)
          done()
        })
    })

    it('should not unlike invalid post', function(done) {
      request
        .post(app.config.host + '/v1/posts/:id/unlike')
        .send({ authToken: authToken })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(422)
          done()
        })
    })
  })
})
