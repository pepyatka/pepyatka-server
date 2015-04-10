var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')
  , funcTestHelper = require('./functional_test_helper')

describe("CommentsController", function() {
  beforeEach(funcTestHelper.flushDb())

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

      funcTestHelper.createComment(body, post.id, authToken, function(err, res) {
        res.body.should.not.be.empty
        res.body.should.have.property('comments')
        res.body.comments.should.have.property('body')
        res.body.comments.body.should.eql(body)

        done()
      })
    })

    it('should not create a comment for an invalid user', function(done) {
      var body = "Comment"

      funcTestHelper.createComment(body, post.id, "token", function(err, res) {
        err.should.not.be.empty
        err.status.should.eql(401)

        done()
      })
    })

    it('should not create a comment for an invalid post', function(done) {
      var body = "Comment"

      funcTestHelper.createComment(body, 'id', authToken, function(err, res) {
        err.should.not.be.empty
        err.status.should.eql(422)

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

              funcTestHelper.createComment(body, post.id, authToken, function(err, res) {
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

  describe('#destroy()', function() {
    var user
      , post
      , comment
      , authToken

    beforeEach(function(done) {
      user = {
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

              funcTestHelper.createComment(body, post.id, authToken, function(err, res) {
                comment = res.body.comments

                done()
              })
            })
        })
    })

    it('should destroy valid comment', function(done) {
      request
        .post(app.config.host + '/v1/comments/' + comment.id)
        .send({
          authToken: authToken,
          '_method': 'delete'
        })
        .end(function(err, res) {
          res.body.should.be.empty
          res.status.should.eql(200)

          request
            .get(app.config.host + '/v1/timelines/' + user.username + '/comments')
            .query({ authToken: authToken })
            .end(function(err, res) {
              res.should.not.be.empty
              res.body.should.not.be.empty
              res.body.should.have.property('timelines')
              res.body.timelines.should.have.property('name')
              res.body.timelines.name.should.eql('Comments')
              res.body.timelines.should.have.property('posts')
              res.body.timelines.posts.length.should.eql(1)
              res.body.should.have.property('posts')
              res.body.posts[0].comments.length.should.eql(0)
              done()
            })
        })
    })

    it('should not destroy valid comment without user', function(done) {
      request
        .post(app.config.host + '/v1/comments/' + comment.id)
        .send({
          '_method': 'delete'
        })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)
          done()
        })
    })
  })
})
