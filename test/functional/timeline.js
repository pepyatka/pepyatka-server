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
  var user2Agent;

  before(function(done) {
    var userAgentCreated = false;
    var user2AgentCreated = false;

    var invokeCallback = function() {
      if (userAgentCreated && user2AgentCreated) done()
    }

    var newUser = new models.User({
      username: 'username',
      password: 'password'
    })
    newUser.save(function(err, user) {
      userAgent = agent.agent();
      userAgent
        .post('localhost:' + server.get('port') + '/v1/session')
        .send({ username: 'username', password: 'password' })
        .end(function(err, res) {
          userAgentCreated = true
          invokeCallback()
        });
    })

    var newUser2 = new models.User({
      username: 'username2',
      password: 'password'
    })
    newUser2.save(function(err, user) {
      user2Agent = agent.agent();
      user2Agent
        .post('localhost:' + server.get('port') + '/v1/session')
        .send({ username: 'username2', password: 'password' })
        .end(function(err, res) {
          user2AgentCreated = true
          invokeCallback()
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
              .get('/v1/timeline/' + timeline.id + '/subscribers')
              .expect(200)
              .end(function(err, res) {
                assert(res.body.length > 0)
                done()
              })
          })
      })
    })
  })

  it('POST /v1/timeline/:timelineId/subscribe should subscribe A to B and B to C', function(done) {
    var that = {}

    var subscribeUser2ToUser = function(callback){
      models.User.findByUsername('username', function(err, user) {
        that.user = user
        user.getLikesTimeline({start: 0}, function(err, timeline) {
          user2Agent
            .post('localhost:' + server.get('port') + '/v1/timeline/' + timeline.id + '/subscribe')
            .end(function(err, res) {
              callback()
            })
        })
      })
    }

    var subscribeUserToAnon = function(callback){
      models.User.findAnon(function(err, anonymous) {
        that.anonymous = anonymous
        anonymous.getLikesTimeline({start: 0}, function(err, timeline) {
          userAgent
            .post('localhost:' + server.get('port') + '/v1/timeline/' + timeline.id + '/subscribe')
            .end(function(err, res) {
              callback()
            })
        })
      })
    }

    var createPostByAnon = function(callback) {
      that.anonymous.newPost({
        body: 'anonPostBody'
      }, function(err, newPost) {
        newPost.create(function(err, post) {
          that.postId = post.id
          callback()
        })
      })
    }

    var likeAnonPostByUser = function(callback) {
      userAgent
        .post('localhost:' + server.get('port') + '/v1/posts/' + that.postId + '/like')
        .end(function(err, res) {
          callback()
        })
    }

    var checkUser2RiverOfNews = function(callback) {
      models.User.findByUsername('username2', function(err, user2) {
        user2.getRiverOfNews({start: 0}, function(err, riverOfNews) {
          riverOfNews.getPostsIds(0, 25, function(err, postsIds) {
            var isPostAdded = false;
          async.forEach(postsIds, function(postId, callback) {
              if (postId == that.postId) {
                isPostAdded = true
              }

              callback()
            },
            function(err) {
              assert.equal(isPostAdded, true)
              callback()
            })
          })
        })
      })
    }

    subscribeUser2ToUser(function() {
      subscribeUserToAnon(function() {
        createPostByAnon(function() {
          likeAnonPostByUser(function() {
            checkUser2RiverOfNews(done)
          })
        })
      })
    })
  })

  it('POST /v1/timeline/not-exist-timelineId/subscribe should return 422', function(done) {
    request(server)
      .post('/v1/timeline/not-exist-timelineId/subscribe')
      .expect(422, done)
  })

  it('POST /v1/timeline/not-exist-timelineId/unsubscribe should return 422', function(done) {
    request(server)
      .post('/v1/timeline/not-exist-timelineId/unsubscribe')
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
