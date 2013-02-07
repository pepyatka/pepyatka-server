var request = require('supertest')
  , assert = require('assert')

var server = require('../../server')
  , models = require('../../app/models')

describe('Post API', function() {
  it('GET /v1/posts/this-post-does-not-exist should return 404', function(done) {
    request(server)
      .get('/v1/posts/this-post-does-not-exist')
      .expect(404, done)
  })

  it('GET /v1/posts/:postId should return json post', function(done) {
    models.User.findAnon(function(err, user) {
      user.newPost({
        body: 'postBody'
      }, function(err, newPost) {
        newPost.save(function(err, post) {
          request(server)
            .get('/v1/posts/' + post.id)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              assert.equal(err, null)

              var jsonPost = res.body
              assert.equal(post.id, jsonPost.id)
              assert.equal(post.body, jsonPost.body)
              assert.equal(post.createdAt, jsonPost.createdAt)
              // Read defect in post.save() function
              // assert.equal(post.updatedAt, jsonPost.updatedAt)
              assert(Array.isArray(jsonPost.comments))
              assert.equal(jsonPost.comments.length, 0)
              assert(Array.isArray(jsonPost.attachments))
              assert.equal(jsonPost.attachments.length, 0)
              done()
            })
        })
      })
    })
  })

  it('POST /v1/posts should create post and return json object', function(done) {
    var params = { 
      body: 'postBody'
    }
    request(server)
      .post('/v1/posts')
      .send(params)
      .expect(200)
      .end(function(err, res) {
        assert.equal(err, null)

        var jsonPost = res.body
        assert(!!jsonPost.id)
        assert(!!jsonPost.createdAt)
        assert(!!jsonPost.updatedAt)
        assert.equal(params.body, jsonPost.body)
        // XXX: test userId
        assert(Array.isArray(jsonPost.comments))
        assert.equal(jsonPost.comments.length, 0)
        assert(Array.isArray(jsonPost.attachments))
        assert.equal(jsonPost.attachments.length, 0)

        done()
      })
  })

  it('POST /v1/posts with gif attachment should create post and return json object', function(done) {
    var params = { 
      body: 'postBody'
    }
    request(server)
      .post('/v1/posts')
      .attach('file-0', 'test/fixtures/animated.gif')
      .field('body', params.body)
      .expect(200)
      .end(function(err, res) {
        assert.equal(err, null)

        var jsonPost = res.body
        assert(!!jsonPost.id)
        assert(!!jsonPost.createdAt)
        assert(!!jsonPost.updatedAt)
        assert.equal(params.body, jsonPost.body)
        // XXX: test userId
        assert(Array.isArray(jsonPost.comments))
        assert.equal(jsonPost.comments.length, 0)

        assert(Array.isArray(jsonPost.attachments))
        assert.equal(jsonPost.attachments.length, 1)
        var jsonAttachment = jsonPost.attachments[0]
        assert(!!jsonAttachment.id)
        // TODO: content-disposition
        // assert.equal(jsonAttachment.ext, 'gif')
        // assert.equal(jsonAttachment.filename, 'animated.gif')
        // XXX
        // assert(!!jsonAttachment.fsPath)
        assert(!!jsonAttachment.path)

        assert(!!jsonAttachment.thumbnail)
        var jsonThumbnail = jsonAttachment.thumbnail
        assert(!!jsonThumbnail.id)
        // TODO: content-disposition
        // assert.equal(jsonThumbnail.ext, 'gif')
        // assert.equal(jsonThumbnail.filename, 'animated.gif')
        assert(!!jsonThumbnail.path)
        // XXX
        // assert(!!jsonThumbnail.fsPath)

        done()
      })
  })

  it('POST /v1/posts with zip attachment should create post and return json object without attachment', function(done) {
    var params = { 
      body: 'postBody'
    }
    request(server)
      .post('/v1/posts')
      .attach('file-0', 'test/fixtures/blank.zip')
      .field('body', params.body)
      .expect(200)
      .end(function(err, res) {
        assert.equal(err, null)
        
        var jsonPost = res.body
        assert(!!jsonPost.id)
        assert(!!jsonPost.createdAt)
        assert(!!jsonPost.updatedAt)
        assert.equal(params.body, jsonPost.body)
        // XXX: test userId
        assert(Array.isArray(jsonPost.comments))
        assert.equal(jsonPost.comments.length, 0)
        assert(Array.isArray(jsonPost.attachments))
        assert.equal(jsonPost.attachments.length, 0)

        done()
      })
  })

  it('POST /v1/posts with missing body should return 200', function(done) {
    var params = {
      userId: 'userId'
    }
    request(server)
      .post('/v1/posts')
      .send(params)
      .expect(422, done)
  })
})
