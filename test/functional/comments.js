var request = require('supertest')
  , agent = require('superagent')
  , assert = require('assert')

var server = require('../../index')
  , models = require('../../app/models')

describe('Comment API', function() {
  var post = null
  var userAgent
    , token

  before(function(done) {
    var newUser = new models.User({
      username: 'username',
      password: 'password'
    })
    newUser.create(function(err, user) {
      userAgent = agent.agent();
      userAgent
        .post('localhost:' + server.get('port') + '/v2/session')
        .send({ username: 'username', password: 'password' })
        .end(function(err, res) {
          token = res.body.token
          done()
        });
    })
  })

  beforeEach(function(done) {
    models.User.findAnon(function(err, user) {
      user.newPost({
        body: 'postBody'
      }, function(err, newPost) {
        newPost.create(function(err, usersPost) {
          post = usersPost
          done()
        })
      })
    })
  })

  it('POST /v2/comments should return json comment', function(done) {
    var params = {
      body: 'commentBody',
      postId: post.id
    }
    request(server)
      .post('/v2/comments' + '?token=' + token)
      .send(params)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        assert.equal(err, null)

        var jsonComment = res.body
        assert(!!jsonComment.id)
        assert(!!jsonComment.createdAt)
        assert(!!jsonComment.updatedAt)
        // Not implemented yet
        // assert(!!jsonComment.updatedAt)
        // assert.equal(jsonComment.createdAt, jsonComment.updatedAt)
        assert.equal(params.body, jsonComment.body)
        assert.equal(params.postId, jsonComment.postId)

        done()
      })
  })

  it('POST /v2/comments with missing body should return 422', function(done) {
    var params = {
      postId: post.id
    }
    request(server)
      .post('/v2/comments' + '?token=' + token)
      .send(params)
      .expect(422, done)
  })

  it('POST /v2/comments with missing postId should return 422', function(done) {
    var params = {
      body: 'commentBody'
    }
    request(server)
      .post('/v2/comments' + '?token=' + token)
      .send(params)
      .expect(422, done)
  })

  it('POST /v2/comments with wrong postId should return 422', function(done) {
    var params = {
      body: 'commentBody',
      postId: 'this-post-does-not-exist'
    }
    request(server)
      .post('/v2/comments' + '?token=' + token)
      .send(params)
      .expect(422, done)
  })

  it('DELETE /v2/comments/:commentId should remove comment', function(done) {
    models.User.findByUsername('username', function(err, user) {
      user.newPost({
        body: 'postBody'
      }, function(err, newPost) {
        newPost.create(function(err, usersPost) {
          var newComment = user.newComment({
            body: 'commentBody',
            postId: usersPost.id
          })
          newComment.create(function(err, comment) {
            var params = {
              '_method': 'delete'
            }
            userAgent
              .post('localhost:' + server.get('port') + '/v2/comments/' + comment.id + '?token=' + token)
              .send(params)
              .end(function(err, res) {
                // TODO: res should have status 200
                models.Comment.findById(comment.id, function(err, comment) {
                  assert.equal(err, null)
                  assert.equal(comment, null)
                  done()
                })
              })
          })
        })
      })
    })
  })

  it('PATCH /v2/comments/:commentId should edit comment', function(done) {
    models.User.findByUsername('username', function(err, user) {
      user.newPost({
        body: 'postBody'
      }, function(err, newPost) {
        newPost.create(function(err, usersPost) {
          var newComment = user.newComment({
            body: 'commentBody',
            postId: post.id
          })
          newComment.create(function(err, comment) {
            var params = {
              body: 'newCommentBody',
              '_method': 'patch'
            }
            userAgent
              .post('localhost:' + server.get('port') + '/v2/comments/' + comment.id + '?token=' + token)
              .send(params)
              .end(function(res) {
                // TODO: res should have status 200
                models.Comment.findById(comment.id, function(err, updatedComment) {
                  assert.equal(err, null)
                  assert.equal(updatedComment.body, params.body)
                  done()
                })
              })
          })
        })
      })
    })
  })
})
