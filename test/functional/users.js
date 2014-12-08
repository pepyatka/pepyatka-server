var request = require('supertest')
  , assert = require('assert')
  , agent = require('superagent')
  , async = require('async')

var redis = require('../../db')
  , db = redis.connect()

var server = require('../../index')
  , models = require('../../app/models')

describe('Users API', function() {
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

  it('GET /v2/users/:username/subscriptions should return subscritions of user', function(done) {
    models.User.findAnon(function(err, anonymous) {
      models.User.findByUsername('username', function(err, user) {
        anonymous.getPostsTimeline({start: 0}, function(err, timeline) {
          userAgent
            .post('localhost:' + server.get('port') + '/v2/timeline/' + timeline.id + '/subscribe' + '?token=' + token)
            .end(function(err, res) {
              request(server)
                .get('/v2/users/' + user.username + '/subscriptions' + '?token=' + token)
                .end(function(err, res) {
                  assert(res.body.length > 0)
                  done()
                })
            })
        })
      })
    })
  })

  it('GET /v2/users/:username/subscribers should return subscribers of user', function(done) {
    models.User.findAnon(function(err, anonymous) {
      anonymous.getPostsTimeline({start: 0}, function(err, timeline) {
        userAgent
          .post('localhost:' + server.get('port') + '/v2/timeline/' + timeline.id + '/subscribe' + '?token=' + token)
          .end(function(err, res) {
            request(server)
              .get('/v2/users/anonymous/subscribers' + '?token=' + token)
              .end(function(err, res) {
                assert(res.body.subscribers.length > 0)
                done()
              })
          })
      })
    })
  })

  it('GET /v2/users/:userId should return user', function(done) {
    models.User.findByUsername('username', function(err, user) {
      request(server)
        .get('/v2/users/' + user.id + '?token=' + token)
        .expect(200)
        .end(function(err, res) {
          assert.equal(res.body.id, user.id)
          done()
        })
    })
  })

  it('GET /v2/users/user-not-exist/subscriptions should return 404', function(done) {
    request(server)
      .get('/v2/users/user-not-exist/subscriptions' + '?token=' + token)
      .expect(404, done)
  })

  it('GET /v2/users/user-not-exist/subscribers should return 404', function(done) {
    request(server)
      .get('/v2/users/user-not-exist/subscribers' + '?token=' + token)
      .expect(404, done)
  })

  it('GET /v2/users/user-not-exist should return 422', function(done) {
    request(server)
      .get('/v2/users/user-not-exist' + '?token=' + token)
      .expect(404, done)
  })

  it('PATCH /v2/users should update user', function(done) {
    models.User.findByUsername('username', function(err, user) {
      var params = {
        params: {
          userId: user.id,
          screenName: "new name"
        },
        '_method': 'patch'
      }
      userAgent
        .post('localhost:' + server.get('port') + '/v2/users' + '?token=' + token)
        .send(params)
        .end(function(err, res) {
          assert(res.res.headers['content-type'].match(/json/))
          assert.equal(res.res.statusCode, 200)

          assert.equal(res.body.id, user.id)
          assert.equal(res.body.username, user.username)
          assert.equal(res.body.info.screenName, params.params.screenName)

          done()
        })
    })
  })
})
