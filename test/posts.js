var request = require('supertest')
  , assert = require('assert')

var server = require('../server')

describe('Post API', function(){
  it('GET /posts/:postId should return 404', function(done) {
    request(server)
      .get('/v1/posts/this-post-does-not-exist')
      .expect(404, done)
  })

  it('POST /posts should return 200', function(done) {
    request(server)
      .post('/v1/posts')
      .send({ body: 'Hello world' })
      .expect(200, done)
  })
})
