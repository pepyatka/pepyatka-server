var request = require('supertest')
  , assert = require('assert')
  , async = require('async')

var redis = require('../../db')
  , db = redis.connect()

var server = require('../../server')
  , models = require('../../app/models')

describe('Timeline API', function() {
  it('GET /v1/timeline/anonymous should return json list of posts', function(done) {
    var posts = []
    var length = 40

    db.flushdb(function(err) {
      var userId = models.User.anon(function(userId) {
        for(var i = 0; i < length; i++) {
          posts.push(new models.Post({ 
            body: 'postBody-' + i.toString(), 
            userId: userId
          }));
        }

        async.forEachSeries(posts, function(post, callback) {
          post.save(function() {
            callback(null)
          })
        }, function(err) {
          request(server)
            .get('/v1/timeline/anonymous')
            .expect('Content-Type', /json/)
            .expect(200, function(err, res) {
              assert.equal(err, null)
              
              var jsonTimeline = res.body
              assert.equal(jsonTimeline.posts.length, 25)
              assert.equal(jsonTimeline.posts[0].body, 'postBody-39')
              assert.equal(jsonTimeline.posts[24].body, 'postBody-15')

              done()
            })      
        })
      })
    })
  })

  it('GET /v1/timeline/404-user should return 404'
     // , function(done) {
     //   request(server)
     //     .get('/v1/timeline/anonymous')
     //     .expect(404, done)
     // }
    )
})
