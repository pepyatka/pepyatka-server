var request = require('supertest')
  , assert = require('assert')

var server = require('../../server')
  , models = require('../../app/models')

describe('Comment API', function() {
  var post = null

  beforeEach(function(done) {
    models.User.findAnon(function(err, user) {
      user.newPost({
        body: 'postBody'
      }, function(err, newPost) {
        newPost.save(function(err, usersPost) {
          post = usersPost
          done()
        })
      })
    })
  })

  it('POST /v1/comments should return json comment', function(done) {
    var params = { 
      body: 'commentBody',
      postId: post.id
    }
    request(server)
      .post('/v1/comments')
      .send(params)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        assert.equal(err, null)
        
        var jsonComment = res.body
        assert(!!jsonComment.id)
        assert(!!jsonComment.createdAt)
        // Not implemented yet
        // assert(!!jsonComment.updatedAt)
        // assert.equal(jsonComment.createdAt, jsonComment.updatedAt)
        assert.equal(params.body, jsonComment.body)
        assert.equal(params.postId, jsonComment.postId)
        
        done()
      })
  })

  it('POST /v1/comments with missing body should return 200', function(done) {
    var params = {
      postId: post.id
    }
    request(server)
      .post('/v1/comments')
      .send(params)
      .expect(200, done)
  })

  it('POST /v1/comments with missing postId should return 422'
     // , function(done) {
     //   var params = { 
     //     body: 'commentBody'
     //   }
     //   request(server)
     //     .post('/v1/comments')
     //     .send(params)
     //     .expect(422, done)
     // }
    )

  it('POST /v1/comments with wrong postId should return 422'
     // , function(done) {
     //   var params = { 
     //     body: 'commentBody',
     //     postId: 'this-post-does-not-exist'
     //   }
     //   request(server)
     //     .post('/v1/comments')
     //     .send(params)
     //     .expect(422, done)
     // }
    )
})
