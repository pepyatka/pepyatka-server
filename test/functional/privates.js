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

    describe('can protect private posts', function() {
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
          done()
        })
      })

      it('that should not be visible to ex-subscribers', function(done) {
        funcTestHelper.getTimeline('/v1/timelines/home', zeusContext.authToken, function(err, res) {
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

      it('that should not be visible to users that are not subscribed', function(done) {
        request
          .get(app.config.host + '/v1/posts/' + lunaContext.post.id)
          .query({ authToken: zeusContext.authToken })
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

      it('should not be visible to unsubscribed users', function(done) {
        request
          .get(app.config.host + '/v1/users/' + marsContext.username + '/subscriptions')
          .query({ authToken: marsContext.authToken })
          .end(function(err, res) {
            res.body.should.not.be.empty
            res.body.should.have.property('subscriptions')
            res.body.subscriptions.should.be.empty
            done()
          })
      })

      it('should be visible to mutual friends', function(done) {
        funcTestHelper.subscribeToCtx(marsContext, lunaContext.username)(function() {
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
})
