var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')
  , funcTestHelper = require('./functional_test_helper')
  , config = require('../../config/config').load()
  , _ = require('lodash')

describe("MutualFriends", function() {
  beforeEach(funcTestHelper.flushDb())

  describe('user Luna and user Mars', function() {
    var lunaContext = {}
      , marsContext = {}
      , zeusContext = {}

    beforeEach(funcTestHelper.createUserCtx(lunaContext, 'luna', 'pw'))
    beforeEach(funcTestHelper.createUserCtx(marsContext, 'mars', 'pw'))
    beforeEach(funcTestHelper.createUserCtx(zeusContext, 'zeus', 'pw'))

    describe('publish private post to public feed', function() {
      var group = 'group'

      beforeEach(function(done) { funcTestHelper.subscribeToCtx(marsContext, lunaContext.username)(done) })
      beforeEach(function(done) { funcTestHelper.subscribeToCtx(lunaContext, marsContext.username)(done) })
      beforeEach(function(done) {
        request
          .post(app.config.host + '/v1/groups')
          .send({ group: { username: group, screenName: group },
                  authToken: lunaContext.authToken })
          .end(function(err, res) {
            done()
          })
      })
      beforeEach(function(done) { funcTestHelper.subscribeToCtx(zeusContext, group)(done) })

      it('should send private post to public feed', function(done) {
        var post = 'post'
        request
          .post(app.config.host + '/v1/posts')
          .send({ post: { body: post }, meta: { feeds: [group, lunaContext.user.username] }, authToken: lunaContext.authToken })
          .end(function(err, res) {
            funcTestHelper.getTimeline('/v1/timelines/home', zeusContext.authToken, function(err, res) {
              res.should.not.be.empty
              res.body.should.not.be.empty
              res.body.should.have.property('timelines')
              res.body.timelines.should.have.property('name')
              res.body.timelines.name.should.eql('RiverOfNews')
              res.body.timelines.should.have.property('posts')
              res.body.timelines.posts.length.should.eql(1)
              res.body.should.have.property('posts')
              res.body.posts.length.should.eql(1)
              var _post = res.body.posts[0]
              _post.body.should.eql(post)
              request
                .post(app.config.host + '/v1/posts/' + _post.id + '/like')
                .send({ authToken: zeusContext.authToken })
                .end(function(err, res) {
                  funcTestHelper.getTimeline('/v1/timelines/' + zeusContext.user.username +'/likes', zeusContext.authToken, function(err, res) {
                    res.should.not.be.empty
                    res.body.should.not.be.empty
                    res.body.should.have.property('timelines')
                    res.body.timelines.should.have.property('name')
                    res.body.timelines.name.should.eql('Likes')
                    res.body.timelines.should.have.property('posts')
                    res.body.timelines.posts.length.should.eql(1)
                    res.body.should.have.property('posts')
                    res.body.posts.length.should.eql(1)
                    var _post = res.body.posts[0]
                    _post.body.should.eql(post)
                    request
                      .get(app.config.host + '/v1/posts/' + _post.id)
                      .query({ authToken: zeusContext.authToken })
                      .end(function(err, res) {
                        res.body.should.not.be.empty
                        res.body.posts.body.should.eql(_post.body)
                        done()
                      })
                  })
                })
            })
          })
      })
    })

    describe('can protect private posts', function() {
      var herculesContext = {}

      beforeEach(function(done) { funcTestHelper.subscribeToCtx(marsContext, lunaContext.username)(done) })
      beforeEach(function(done) { funcTestHelper.subscribeToCtx(lunaContext, marsContext.username)(done) })
      beforeEach(function(done) { funcTestHelper.subscribeToCtx(zeusContext, lunaContext.username)(done) })
      beforeEach(function(done) {
        request
          .post(app.config.host + '/v1/users/' + lunaContext.user.id)
          .send({ authToken: lunaContext.authToken,
                  user: { isPrivate: "1" },
                  '_method': 'put' })
          .end(function(err, res) {
            done()
          })
      })
      beforeEach(function(done) { funcTestHelper.createPost(lunaContext, 'Post body')(done) })
      beforeEach(funcTestHelper.createUserCtx(herculesContext, 'hercules', 'pw'))

      describe('and manage subscription requests', function() {
        beforeEach(function(done) {
          request
            .post(app.config.host + '/v1/users/' + lunaContext.user.username + '/sendRequest')
            .send({ authToken: zeusContext.authToken,
                    '_method': 'post' })
            .end(function(err, res) {
              done()
            })
        })

        it('should reject subscription request after ban', function(done) {
          request
            .post(app.config.host + '/v1/users/' + zeusContext.user.username + '/ban')
            .send({ authToken: lunaContext.authToken })
            .end(function(err, res) {
              request
                .get(app.config.host + '/v1/users/whoami')
                .query({ authToken: lunaContext.authToken })
                .end(function(err, res) {
                  res.should.not.be.empty
                  res.body.should.not.be.empty
                  res.body.should.have.property('users')
                  res.body.users.should.not.have.property('subscriptionRequests')
                  done()
                })
            })
        })

        it('should not allow banned user to send subscription request', function(done) {
          request
            .post(app.config.host + '/v1/users/' + zeusContext.user.username + '/ban')
            .send({ authToken: lunaContext.authToken })
            .end(function(err, res) {
              request
                .post(app.config.host + '/v1/users/' + lunaContext.user.username + '/sendRequest')
                .send({ authToken: zeusContext.authToken,
                        '_method': 'post' })
                .end(function(err, res) {
                  res.should.not.be.empty
                  res.body.err.should.not.be.empty
                  res.body.err.should.eql('Invalid')
                  request
                    .get(app.config.host + '/v1/users/whoami')
                    .query({ authToken: lunaContext.authToken })
                    .end(function(err, res) {
                      res.should.not.be.empty
                      res.body.should.not.be.empty
                      res.body.should.have.property('users')
                      res.body.users.should.not.have.property('subscriptionRequests')
                      done()
                    })
                })
            })
        })

        it('should show liked post per context', function(done) {
          request
            .post(app.config.host + '/v1/users/acceptRequest/' + zeusContext.user.username)
            .send({ authToken: lunaContext.authToken,
                    '_method': 'post' })
            .end(function(err, res) {
              request
                .post(app.config.host + '/v1/posts/' + lunaContext.post.id + '/like')
                .send({ authToken: marsContext.authToken })
                .end(function(err, res) {
                  funcTestHelper.getTimeline('/v1/timelines/' + marsContext.user.username + '/likes', marsContext.authToken, function(err, res) {
                    // NOTE: right now we do not have meta to show
                    // posts per context, once this done we'll need to
                    // refactor this test

                    // view mars/likes timeline as mars -- 0 posts
                    res.body.should.not.have.property('posts')

                    funcTestHelper.getTimeline('/v1/timelines/' + marsContext.user.username + '/likes', zeusContext.authToken, function(err, res) {
                      // view mars/likes timeline as zeus -- 0 posts
                      res.body.should.not.have.property('posts')

                      done()
                    })
                  })
                })
            })
        })

        it('should show liked post per context', function(done) {
          request
            .post(app.config.host + '/v1/users/acceptRequest/' + zeusContext.user.username)
            .send({ authToken: lunaContext.authToken,
                    '_method': 'post' })
            .end(function(err, res) {
              funcTestHelper.createComment('comment', lunaContext.post.id, marsContext.authToken, function(err, res) {
                funcTestHelper.getTimeline('/v1/timelines/' + marsContext.user.username + '/comments', marsContext.authToken, function(err, res) {
                  // NOTE: right now we do not have meta to show
                  // posts per context, once this done we'll need to
                  // refactor this test

                  // view mars/comments timeline as mars -- 0 posts
                  res.body.should.not.have.property('posts')

                  funcTestHelper.getTimeline('/v1/timelines/' + marsContext.user.username + '/comments', zeusContext.authToken, function(err, res) {
                    // view mars/comments timeline as zeus -- 0 posts
                    res.body.should.not.have.property('posts')

                    done()
                  })
                })
              })
            })
        })

        it('should not be accepted by invalid user', function(done) {
          request
            .post(app.config.host + '/v1/users/acceptRequest/' + zeusContext.user.username)
            .send({ authToken: zeusContext.authToken,
                    '_method': 'post' })
            .end(function(err, res) {
              err.should.not.be.empty
              err.status.should.eql(422)
              done()
            })
        })

        it('should be able to accept', function(done) {
          request
            .post(app.config.host + '/v1/users/acceptRequest/' + zeusContext.user.username)
            .send({ authToken: lunaContext.authToken,
                    '_method': 'post' })
            .end(function(err, res) {
              res.should.not.be.empty
              res.error.should.be.empty

              request
                .get(app.config.host + '/v1/users/whoami')
                .query({ authToken: lunaContext.authToken })
                .end(function(err, res) {
                  // check there are no subscription requests
                  res.should.not.be.empty
                  res.body.should.not.be.empty
                  res.body.should.have.property('users')
                  res.body.users.should.not.have.property('subscriptionRequests')
                  res.body.should.not.have.property('requests')

                  request
                    .get(app.config.host + '/v1/users/whoami')
                    .query({ authToken: lunaContext.authToken })
                    .end(function(err, res) {
                      // check there are no pending requests
                      res.should.not.be.empty
                      res.body.should.not.be.empty
                      res.body.should.have.property('users')
                      res.body.users.should.not.have.property('pendingSubscriptionRequests')
                      res.body.should.not.have.property('requests')

                      funcTestHelper.getTimeline('/v1/timelines/home', zeusContext.authToken, function(err, res) {
                        // check user is subscribed
                        res.should.not.be.empty
                        res.body.should.not.be.empty
                        res.body.should.have.property('timelines')
                        res.body.timelines.should.have.property('name')
                        res.body.timelines.name.should.eql('RiverOfNews')
                        res.body.timelines.should.have.property('posts')
                        res.body.timelines.posts.length.should.eql(1)
                        res.body.should.have.property('posts')
                        res.body.posts.length.should.eql(1)
                        var post = res.body.posts[0]
                        post.body.should.eql(lunaContext.post.body)
                        done()
                      })
                    })
                })
            })
        })

        it('should be able to reject', function(done) {
          request
            .post(app.config.host + '/v1/users/' + lunaContext.user.username + '/sendRequest')
            .send({ authToken: herculesContext.authToken,
                    '_method': 'post' })
            .end(function(err, res) {
              request
                .post(app.config.host + '/v1/users/rejectRequest/' + herculesContext.user.username)
                .send({ authToken: lunaContext.authToken,
                        '_method': 'post' })
                .end(function(err, res) {
                  res.should.not.be.empty
                  res.error.should.be.empty

                  request
                    .get(app.config.host + '/v1/users/whoami')
                    .query({ authToken: lunaContext.authToken })
                    .end(function(err, res) {
                      // check there are no subscription requests
                      res.should.not.be.empty
                      res.body.should.not.be.empty
                      res.body.should.have.property('users')
                      res.body.users.should.have.property('subscriptionRequests')
                      res.body.should.have.property('requests')
                      // request from zeus
                      res.body.users.subscriptionRequests.length.should.eql(1)
                      res.body.requests.length.should.eql(1)

                      request
                        .get(app.config.host + '/v1/users/whoami')
                        .query({ authToken: herculesContext.authToken })
                        .end(function(err, res) {
                          res.should.not.be.empty
                          res.body.should.not.be.empty
                          res.body.should.have.property('users')
                          res.body.users.should.not.have.property('pendingSubscriptionRequests')
                          res.body.should.not.have.property('requests')

                          funcTestHelper.getTimeline('/v1/timelines/home', herculesContext.authToken, function(err, res) {
                            // check user is not subscribed
                            res.should.not.be.empty
                            res.body.should.not.be.empty
                            res.body.should.have.property('timelines')
                            res.body.timelines.should.have.property('name')
                            res.body.timelines.name.should.eql('RiverOfNews')
                            res.body.timelines.should.not.have.property('posts')
                            res.body.should.not.have.property('posts')
                            done()
                          })
                        })
                    })
                })
            })
        })
      })

      xit('should protect user stats', function(done) {
        funcTestHelper.getTimeline('/v1/timelines/' + lunaContext.user.username, herculesContext.authToken, function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('users')
          res.body.users[0].should.not.have.property('statistics')

          funcTestHelper.getTimeline('/v1/timelines/' + lunaContext.user.username, lunaContext.authToken, function(err, res) {
            res.should.not.be.empty
            res.body.should.not.be.empty
            res.body.should.have.property('users')
            res.body.users[0].should.have.property('statistics')
            done()
          })
        })
      })

      it('should protect posts timeline', function(done) {
        funcTestHelper.getTimeline('/v1/timelines/' + lunaContext.user.username, herculesContext.authToken, function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('timelines')
          res.body.timelines.should.have.property('name')
          res.body.timelines.name.should.eql('Posts')
          res.body.timelines.should.not.have.property('posts')
          res.body.should.not.have.property('posts')

          funcTestHelper.getTimeline('/v1/timelines/' + lunaContext.user.username, lunaContext.authToken, function(err, res) {
            res.should.not.be.empty
            res.body.should.not.be.empty
            res.body.should.have.property('timelines')
            res.body.timelines.should.have.property('name')
            res.body.timelines.name.should.eql('Posts')
            res.body.timelines.should.have.property('posts')
            res.body.should.have.property('posts')
            done()
          })
        })
      })

      xit('should be visible for auth users in likes timeline', function(done) {
        request
          .post(app.config.host + '/v1/posts/' + lunaContext.post.id + '/like')
          .send({ authToken: lunaContext.authToken })
          .end(function(err, res) {
            funcTestHelper.getTimeline('/v1/timelines/' + lunaContext.user.username + '/likes', lunaContext.authToken, function(err, res) {
              res.should.not.be.empty
              res.body.should.not.be.empty
              res.body.should.have.property('timelines')
              res.body.timelines.should.have.property('name')
              res.body.timelines.name.should.eql('Likes')
              res.body.timelines.should.have.property('posts')
              res.body.should.have.property('posts')
              done()
            })
          })
      })

      it('should protect likes timeline', function(done) {
        request
          .post(app.config.host + '/v1/posts/' + lunaContext.post.id + '/like')
          .send({ authToken: lunaContext.authToken })
          .end(function(err, res) {
            funcTestHelper.getTimeline('/v1/timelines/' + lunaContext.user.username + '/likes', herculesContext.authToken, function(err, res) {
              res.should.not.be.empty
              res.body.should.not.be.empty
              res.body.should.have.property('timelines')
              res.body.timelines.should.have.property('name')
              res.body.timelines.name.should.eql('Likes')
              res.body.timelines.should.not.have.property('posts')
              res.body.should.not.have.property('posts')

              done()
            })
          })
      })

      xit('should be visible for auth users in comments timeline', function(done) {
        funcTestHelper.createComment('body', lunaContext.post.id, lunaContext.authToken, function(err, res) {
          funcTestHelper.getTimeline('/v1/timelines/' + lunaContext.user.username + '/comments', lunaContext.authToken, function(err, res) {
            res.should.not.be.empty
            res.body.should.not.be.empty
            res.body.should.have.property('timelines')
            res.body.timelines.should.have.property('name')
            res.body.timelines.name.should.eql('Comments')
            res.body.timelines.should.have.property('posts')
            res.body.should.have.property('posts')
            done()
          })
        })
      })

      it('should protect comments timeline', function(done) {
        funcTestHelper.createComment('body', lunaContext.post.id, lunaContext.authToken, function(err, res) {
          funcTestHelper.getTimeline('/v1/timelines/' + lunaContext.user.username + '/comments', herculesContext.authToken, function(err, res) {
            res.should.not.be.empty
            res.body.should.not.be.empty
            res.body.should.have.property('timelines')
            res.body.timelines.should.have.property('name')
            res.body.timelines.name.should.eql('Comments')
            res.body.timelines.should.not.have.property('posts')
            res.body.should.not.have.property('posts')
            done()
          })
        })
      })

      it('should not subscribe to private feed', function(done) {
        funcTestHelper.subscribeToCtx(herculesContext, lunaContext.username)(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(403)
          var error = JSON.parse(err.response.error.text)
          error.err.should.eql('You cannot subscribe to private feed')
          funcTestHelper.getTimeline('/v1/timelines/home', herculesContext.authToken, function(err, res) {
            res.should.not.be.empty
            res.body.should.not.be.empty
            res.body.should.have.property('timelines')
            res.body.timelines.should.have.property('name')
            res.body.timelines.name.should.eql('RiverOfNews')
            res.body.timelines.should.not.have.property('posts')
            res.body.should.not.have.property('posts')
            done()
          })
        })
      })

      it('should be able to send and receive subscription request', function(done) {
        request
          .post(app.config.host + '/v1/users/' + lunaContext.user.username + '/sendRequest')
          .send({ authToken: zeusContext.authToken,
                  '_method': 'post' })
          .end(function(err, res) {
            res.should.not.be.empty
            res.error.should.be.empty

            request
              .get(app.config.host + '/v1/users/whoami')
              .query({ authToken: lunaContext.authToken })
              .end(function(err, res) {
                // check there are subscription requests
                res.should.not.be.empty
                res.body.should.not.be.empty
                res.body.should.have.property('users')
                res.body.users.should.have.property('subscriptionRequests')
                res.body.users.subscriptionRequests.length.should.eql(1)
                res.body.should.have.property('requests')
                res.body.requests.length.should.eql(1)
                res.body.requests[0].id.should.eql(zeusContext.user.id)

                request
                  .get(app.config.host + '/v1/users/whoami')
                  .query({ authToken: zeusContext.authToken })
                  .end(function(err, res) {
                    // check there are pending requests
                    res.should.not.be.empty
                    res.body.should.not.be.empty
                    res.body.should.have.property('users')
                    res.body.users.should.have.property('pendingSubscriptionRequests')
                    res.body.users.pendingSubscriptionRequests.length.should.eql(1)
                    res.body.should.have.property('requests')
                    res.body.requests.length.should.eql(1)
                    res.body.requests[0].id.should.eql(lunaContext.user.id)
                    done()
                  })
              })
          })
      })

      it('that should be visible to subscribers only', function(done) {
        funcTestHelper.getTimeline('/v1/timelines/home', marsContext.authToken, function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('timelines')
          res.body.timelines.should.have.property('name')
          res.body.timelines.name.should.eql('RiverOfNews')
          res.body.timelines.should.have.property('posts')
          res.body.timelines.posts.length.should.eql(1)
          res.body.should.have.property('posts')
          res.body.posts.length.should.eql(1)
          var post = res.body.posts[0]
          post.body.should.eql(lunaContext.post.body)
          // post should be visible to owner
          request
            .get(app.config.host + '/v1/posts/' + lunaContext.post.id)
            .query({ authToken: lunaContext.authToken })
            .end(function(err, res) {
              res.body.should.not.be.empty
              res.body.posts.body.should.eql(lunaContext.post.body)
              // post should be visible to subscribers
              request
                .get(app.config.host + '/v1/posts/' + lunaContext.post.id)
                .query({ authToken: lunaContext.authToken })
                .end(function(err, res) {
                  res.body.should.not.be.empty
                  res.body.posts.body.should.eql(lunaContext.post.body)
                  done()
                })
            })
        })
      })

      it('that should be visible to ex-subscribers', function(done) {
        funcTestHelper.getTimeline('/v1/timelines/home', zeusContext.authToken, function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('timelines')
          res.body.timelines.should.have.property('name')
          res.body.timelines.name.should.eql('RiverOfNews')
          res.body.timelines.should.have.property('posts')
          res.body.should.have.property('posts')
          // post should not be visible to ex-subscribers
          request
            .get(app.config.host + '/v1/posts/' + lunaContext.post.id)
            .query({ authToken: zeusContext.authToken })
            .end(function(err, res) {
              res.body.should.not.be.empty
              res.body.posts.body.should.eql(lunaContext.post.body)
              done()
            })
        })
      })

      it('that should not be visible to users that are not subscribed', function(done) {
        request
          .get(app.config.host + '/v1/posts/' + lunaContext.post.id)
          .query({ authToken: herculesContext.authToken })
          .end(function(err, res) {
            err.should.not.be.empty
            err.status.should.eql(403)
            var error = JSON.parse(err.response.error.text)
            error.err.should.eql('Not found')
            done()
          })
      })
    })

    describe('when Luna goes private', function() {
      beforeEach(function(done) { funcTestHelper.createPost(lunaContext, 'Post body')(done) })
      beforeEach(function(done) { funcTestHelper.subscribeToCtx(marsContext, lunaContext.username)(done) })

      describe('with commented post', function() {
        beforeEach(function(done) {
          funcTestHelper.createComment('mars comment', lunaContext.post.id, marsContext.authToken, function(req, res) { done() })
        })
        beforeEach(function(done) {
          funcTestHelper.createComment('zeus comment', lunaContext.post.id, zeusContext.authToken, function(req, res) { done() })
        })
        beforeEach(function(done) {
          request
            .post(app.config.host + '/v1/users/' + lunaContext.user.id)
            .send({ authToken: lunaContext.authToken,
                    user: { isPrivate: '1' },
                    '_method': 'put' })
            .end(function(err, res) {
              done()
            })
        })

        it('should remove posts from ex-followers comments timeline', function(done) {
          funcTestHelper.getTimeline('/v1/timelines/' + marsContext.username + '/comments', zeusContext.authToken, function(err, res) {
            res.should.not.be.empty
            res.body.should.not.be.empty
            res.body.should.have.property('timelines')
            res.body.timelines.should.have.property('name')
            res.body.timelines.name.should.eql('Comments')
            res.body.timelines.should.not.have.property('posts')
            done()
          })
        })

        it('should remove posts from stranger comments timeline', function(done) {
          funcTestHelper.getTimeline('/v1/timelines/' + zeusContext.username + '/comments', zeusContext.authToken, function(err, res) {
            res.should.not.be.empty
            res.body.should.not.be.empty
            res.body.should.have.property('timelines')
            res.body.timelines.should.have.property('name')
            res.body.timelines.name.should.eql('Comments')
            res.body.timelines.should.not.have.property('posts')
            done()
          })
        })

        it('should revive ex-followers posts in comments timeline', function(done) {
          request
            .post(app.config.host + '/v1/users/' + lunaContext.user.id)
            .send({ authToken: lunaContext.authToken,
                    user: { isPrivate: '0' },
                    '_method': 'put' })
            .end(function(err, res) {
              funcTestHelper.getTimeline('/v1/timelines/' + marsContext.username + '/comments', marsContext.authToken, function(err, res) {
                res.should.not.be.empty
                res.body.should.not.be.empty
                res.body.should.have.property('timelines')
                res.body.timelines.should.have.property('name')
                res.body.timelines.name.should.eql('Comments')
                res.body.timelines.should.have.property('posts')
                res.body.timelines.posts.length.should.eql(1)
                res.body.should.have.property('posts')
                res.body.posts.length.should.eql(1)
                res.body.posts[0].body.should.eql(lunaContext.post.body)
                done()
              })
            })
        })

        it('should revive stranger posts in comments timeline', function(done) {
          request
            .post(app.config.host + '/v1/users/' + lunaContext.user.id)
            .send({ authToken: lunaContext.authToken,
                    user: { isPrivate: '0' },
                    '_method': 'put' })
            .end(function(err, res) {
              funcTestHelper.getTimeline('/v1/timelines/' + zeusContext.username + '/comments', zeusContext.authToken, function(err, res) {
                res.should.not.be.empty
                res.body.should.not.be.empty
                res.body.should.have.property('timelines')
                res.body.timelines.should.have.property('name')
                res.body.timelines.name.should.eql('Comments')
                res.body.timelines.should.have.property('posts')
                res.body.timelines.posts.length.should.eql(1)
                res.body.should.have.property('posts')
                res.body.posts.length.should.eql(1)
                res.body.posts[0].body.should.eql(lunaContext.post.body)
                done()
              })
            })
        })
      })

      describe('with liked post', function(done) {
        beforeEach(function(done) {
          request
            .post(app.config.host + '/v1/posts/' + lunaContext.post.id + '/like')
            .send({ authToken: marsContext.authToken })
            .end(function(err, res) {
              done()
            })
        })
        beforeEach(function(done) {
          request
            .post(app.config.host + '/v1/posts/' + lunaContext.post.id + '/like')
            .send({ authToken: zeusContext.authToken })
            .end(function(err, res) {
              done()
            })
        })
        beforeEach(function(done) {
          request
            .post(app.config.host + '/v1/users/' + lunaContext.user.id)
            .send({ authToken: lunaContext.authToken,
                    user: { isPrivate: "1" },
                    '_method': 'put' })
            .end(function(err, res) {
              done()
            })
        })

        it('should remove posts from ex-followers likes timeline', function(done) {
          funcTestHelper.getTimeline('/v1/timelines/' + zeusContext.username + '/likes', zeusContext.authToken, function(err, res) {
            res.should.not.be.empty
            res.body.should.not.be.empty
            res.body.should.have.property('timelines')
            res.body.timelines.should.have.property('name')
            res.body.timelines.name.should.eql('Likes')
            res.body.timelines.should.not.have.property('posts')
            done()
          })
        })

        it('should remove posts from stranger likes timeline', function(done) {
          funcTestHelper.getTimeline('/v1/timelines/' + zeusContext.username + '/likes', zeusContext.authToken, function(err, res) {
            res.should.not.be.empty
            res.body.should.not.be.empty
            res.body.should.have.property('timelines')
            res.body.timelines.should.have.property('name')
            res.body.timelines.name.should.eql('Likes')
            res.body.timelines.should.not.have.property('posts')
            done()
          })
        })

        it('should revive ex-followers posts in likes timeline', function(done) {
          request
            .post(app.config.host + '/v1/users/' + lunaContext.user.id)
            .send({ authToken: lunaContext.authToken,
                    user: { isPrivate: '0' },
                    '_method': 'put' })
            .end(function(err, res) {
              funcTestHelper.getTimeline('/v1/timelines/' + marsContext.username + '/likes', marsContext.authToken, function(err, res) {
                res.should.not.be.empty
                res.body.should.not.be.empty
                res.body.should.have.property('timelines')
                res.body.timelines.should.have.property('name')
                res.body.timelines.name.should.eql('Likes')
                res.body.timelines.should.have.property('posts')
                res.body.timelines.posts.length.should.eql(1)
                res.body.should.have.property('posts')
                res.body.posts.length.should.eql(1)
                res.body.posts[0].body.should.eql(lunaContext.post.body)
                done()
              })
            })
        })

        it('should revive stranger posts in likes timeline', function(done) {
          request
            .post(app.config.host + '/v1/users/' + lunaContext.user.id)
            .send({ authToken: lunaContext.authToken,
                    user: { isPrivate: '0' },
                    '_method': 'put' })
            .end(function(err, res) {
              funcTestHelper.getTimeline('/v1/timelines/' + zeusContext.username + '/likes', zeusContext.authToken, function(err, res) {
                res.should.not.be.empty
                res.body.should.not.be.empty
                res.body.should.have.property('timelines')
                res.body.timelines.should.have.property('name')
                res.body.timelines.name.should.eql('Likes')
                res.body.timelines.should.have.property('posts')
                res.body.timelines.posts.length.should.eql(1)
                res.body.should.have.property('posts')
                res.body.posts.length.should.eql(1)
                res.body.posts[0].body.should.eql(lunaContext.post.body)
                done()
              })
            })
        })

      })
    })

    describe('can go private and unsubscribe followers', function() {
      beforeEach(function(done) { funcTestHelper.createPost(lunaContext, 'Post body')(done) })
      beforeEach(function(done) { funcTestHelper.subscribeToCtx(marsContext, lunaContext.username)(done) })
      beforeEach(function(done) { funcTestHelper.createComment('body', lunaContext.post.id, zeusContext.authToken, done) })
      beforeEach(function(done) {
        request
          .post(app.config.host + '/v1/users/' + lunaContext.user.id)
          .send({ authToken: lunaContext.authToken,
                  user: { isPrivate: "1" },
                  '_method': 'put' })
          .end(function(err, res) {
            done()
          })
      })

      it('should be visible to already subscribed users', function(done) {
        request
          .get(app.config.host + '/v1/users/' + marsContext.username + '/subscriptions')
          .query({ authToken: marsContext.authToken })
          .end(function(err, res) {
            res.body.should.not.be.empty
            res.body.should.have.property('subscriptions')
            res.body.subscriptions.length.should.eql(3)
            done()
          })
      })

      it('should be visible to mutual friends', function(done) {
        request
          .post(app.config.host + '/v1/users/' + lunaContext.user.username + '/sendRequest')
          .send({ authToken: marsContext.authToken,
                  '_method': 'post' })
          .end(function(err, res) {
            request
              .post(app.config.host + '/v1/users/acceptRequest/' + marsContext.user.username)
              .send({ authToken: lunaContext.authToken,
                      '_method': 'post' })
              .end(function(err, res) {
                request
                  .get(app.config.host + '/v1/users/' + marsContext.username + '/subscriptions')
                  .query({ authToken: marsContext.authToken })
                  .end(function(err, res) {
                    res.body.should.not.be.empty
                    res.body.should.have.property('subscriptions')
                    res.body.subscriptions.should.not.be.empty
                    res.body.subscriptions.length.should.eql(3)
                    done()
                  })
              })
          })
      })

      it('should be visible to subscribers', function(done) {
        request
          .get(app.config.host + '/v1/users/' + marsContext.username + '/subscriptions')
          .query({ authToken: marsContext.authToken })
          .end(function(err, res) {
            res.body.should.not.be.empty
            res.body.should.have.property('subscriptions')
            res.body.subscriptions.should.not.be.empty
            res.body.subscriptions.length.should.eql(3)
            done()
          })
      })
    })
  })
})
