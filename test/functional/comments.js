var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')

describe("CommentsController", function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe('#create()', function() {
    var post
      , authToken

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

    it('should create a comment with a valid user', function(done) {
      var body = "Comment"

      request
        .post(app.config.host + '/v1/comments')
        .send({ comment: { body: body, post: post.id }, authToken: authToken })
        .end(function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('comments')
          res.body.comments.should.have.property('body')
          res.body.comments.body.should.eql(body)

          done()
        })
    })

    it('should not create a comment for an invalid user', function(done) {
      var body = "Comment"

      request
        .post(app.config.host + '/v1/comments')
        .send({ comment: { body: body, post: post.id } })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)

          done()
        })
    })

    it('should not create a comment for an invalid post', function(done) {
      var body = "Comment"

      request
        .post(app.config.host + '/v1/comments')
        .send({ comment: { body: body, post: 'id' }, authToken: authToken })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)

          done()
        })
    })
  })

  describe('#update()', function() {
    var post
      , comment
      , authToken

    beforeEach(function(done) {
      var user = {
        username: 'Luna',
        password: 'password'
      }

      request
        .post(app.config.host + '/v1/users')
        .send({ username: user.username, password: user.password })
        .end(function(err, res) {
          authToken = res.body.authToken

          var body = 'Post body'
          request
            .post(app.config.host + '/v1/posts')
            .send({ post: { body: body }, authToken: authToken })
            .end(function(err, res) {
              post = res.body.posts

              var body = "Comment"

              request
                .post(app.config.host + '/v1/comments')
                .send({ comment: { body: body, post: post.id }, authToken: authToken })
                .end(function(err, res) {
                  comment = res.body.comments

                  done()
                })
            })
        })
    })

    it('should update a comment with a valid user', function(done) {
      var newBody = "New body"
      request
        .post(app.config.host + '/v1/comments/' + comment.id)
        .send({ comment: { body: newBody },
                authToken: authToken,
                '_method': 'put'
              })
        .end(function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('comments')
          res.body.comments.should.have.property('body')
          res.body.comments.body.should.eql(newBody)

          done()
        })
    })

    it('should not update a comment with a invalid user', function(done) {
      var newBody = "New body"
      request
        .post(app.config.host + '/v1/comments/' + comment.id)
        .send({ comment: { body: newBody },
                '_method': 'put'
              })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)

          done()
        })
    })
  })
})
