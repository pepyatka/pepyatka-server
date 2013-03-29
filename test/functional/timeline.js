var request = require('supertest')
  , assert = require('assert')
  , agent = require('superagent')
  , async = require('async')

var redis = require('../../db')
  , db = redis.connect()

var server = require('../../server')
  , models = require('../../app/models')

describe('Timeline API', function() {
  var userAgent;

  before(function(done) {
    var newUser = new models.User({
      username: 'username',
      password: 'password'
    })
    newUser.save(function(err, user) {
      userAgent = agent.agent();
      userAgent
        .post('localhost:' + server.get('port') + '/session')
        .send({ username: 'username', password: 'password' })
        .end(function(err, res) {
          done()
        });
    })
  })

  it('POST /v1/timeline/:timelineId/subscribe should subscribe to timeline', function(done) {
    var checkSubscription = function(timelineId, callback) {
      models.User.findByUsername('username', function(err, user) {
        user.getSubscriptionsIds(function(err, subscriptionIds) {
          var isSubscribed = false;
          async.forEach(subscriptionIds, function(subsctiptionId, callback) {
            if (subsctiptionId == timelineId) {
              isSubscribed = true
            }

            callback()
          },
          function(err) {
            assert.equal(isSubscribed, true)
            callback()
          })
        })
      })
    }

    var checkSubscribers = function(timeline, callback) {
      timeline.getSubscribersIds(function(err, subscribersIds) {
        models.User.findByUsername('username', function(err, user) {
          var isSubscribed = false;
          async.forEach(subscribersIds, function(subscribersId, callback) {
              if (subscribersId == user.id) {
                isSubscribed = true
              }

              callback()
            },
            function(err) {
              assert.equal(isSubscribed, true)
              callback()
            })
        })
      })
    }

    models.User.findAnon(function(err, anonymous) {
      anonymous.getPostsTimeline({start: 0}, function(err, timeline) {
        userAgent
          .post('localhost:' + server.get('port') + '/v1/timeline/' + timeline.id + '/subscribe')
          .end(function(err, res) {
            async.parallel([
              function(done){
                checkSubscribers(timeline, done)
              },
              function(done) {
                checkSubscription(timeline.id, done)
              }
            ], function(err) {
              done()
            })
          })
      })
    })
  })

  it('POST /v1/timeline/:timelineId/unsubscribe should unsubscribe from timeline', function(done) {
    var checkSubscription = function(timelineId, callback) {
      models.User.findByUsername('username', function(err, user) {
        user.getSubscriptionsIds(function(err, subscriptionIds) {
          var isSubscribed = false;
          async.forEach(subscriptionIds, function(subsctiptionId, callback) {
              if (subsctiptionId == timelineId) {
                isSubscribed = true
              }

              callback()
            },
            function(err) {
              assert.equal(isSubscribed, false)
              callback()
            })
        })
      })
    }

    var checkSubscribers = function(timeline, callback) {
      timeline.getSubscribersIds(function(err, subscribersIds) {
        models.User.findByUsername('username', function(err, user) {
          var isSubscribed = false;
          async.forEach(subscribersIds, function(subscribersId, callback) {
              if (subscribersId == user.id) {
                isSubscribed = true
              }

              callback()
            },
            function(err) {
              assert.equal(isSubscribed, false)
              callback()
            })
        })
      })
    }

    models.User.findAnon(function(err, anonymous) {
      anonymous.getPostsTimeline({start: 0}, function(err, timeline) {
        userAgent
          .post('localhost:' + server.get('port') + '/v1/timeline/' + timeline.id + '/subscribe')
          .end(function(err, res) {
            userAgent
              .post('localhost:' + server.get('port') + '/v1/timeline/' + timeline.id + '/unsubscribe')
              .end(function(err, res) {
                async.parallel([
                  function(done){
                    checkSubscribers(timeline, done)
                  },
                  function(done) {
                    checkSubscription(timeline.id, done)
                  }
                ], function(err) {
                  done()
                })
              })
          })
      })
    })
  })

  it('GET /v1/timeline/:timelineId/subcribers should return subscibers of timeline', function(done) {
    models.User.findAnon(function(err, anonymous) {
      anonymous.getPostsTimeline({start: 0}, function(err, timeline) {
        userAgent
          .post('localhost:' + server.get('port') + '/v1/timeline/' + timeline.id + '/subscribe')
          .end(function(err, res) {
            request(server)
              .get('/v1/timeline/' + timeline.id + '/subcribers')
              .expect(200)
              .end(function(err, res) {
                assert(res.body[0])
                done()
              })
          })
      })
    })
  })

  it('POST /v1/timeline/not-exist-timelineId/subscribe should return 422', function(done) {
    request(server)
      .post('/v1/not-exist-timelineId/subscribe')
      .expect(422, done)
  })

  it('POST /v1/timeline/not-exist-timelineId/unsubscribe should return 422', function(done) {
    request(server)
      .post('/v1/not-exist-timelineId/unsubscribe')
      .expect(422, done)
  })

  it('GET /v1/timeline/anonymous should return json list of posts', function(done) {
    var posts = []
    var length = 40

    db.flushdb(function(err) {
      models.User.findAnon(function(err, user) {
        var bodies = []
        for(var i = 0; i < length; i++) {
          bodies.push('postBody-' + i.toString())
        }

        async.mapSeries(bodies, function(body, done) {
          user.newPost({
            body: body
          }, function(err, post) {
            done(err, post)
          });
        }, function(err, posts) {
          async.forEachSeries(posts, function(post, callback) {
            post.create(function(err) {
              callback(err)
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
  })

  it('GET /v1/timeline/404-user should return 404', function(done) {
    request(server)
      .get('/v1/timeline/404-user')
      .expect(404, done)
  })
})
