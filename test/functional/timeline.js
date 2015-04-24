var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')
  , funcTestHelper = require('./functional_test_helper')

describe("TimelinesController", function() {
  beforeEach(funcTestHelper.flushDb())

  describe("#home()", function() {
    var username = 'Luna'
    var authToken

    beforeEach(funcTestHelper.createUser(username, 'password', function(token) {
      authToken = token
    }))

    it('should return empty River Of News', function(done) {
      funcTestHelper.getTimeline('/v1/timelines/home', authToken, function(err, res) {
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

    it('should not return River Of News for unauthenticated user', function(done) {
      funcTestHelper.getTimeline('/v1/timelines/home', null, function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)
          done()
        })
    })

    it('should return River of News with one post', function(done) {
      var body = 'Post body'

      request
        .post(app.config.host + '/v1/posts')
        .send({ post: { body: body }, authToken: authToken })
        .end(function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('posts')
          res.body.posts.should.have.property('body')
          res.body.posts.body.should.eql(body)

          funcTestHelper.getTimeline('/v1/timelines/home', authToken, function(err, res) {
              res.should.not.be.empty
              res.body.should.not.be.empty
              res.body.should.have.property('timelines')
              res.body.timelines.should.have.property('name')
              res.body.timelines.name.should.eql('RiverOfNews')
              res.body.timelines.should.have.property('posts')
              res.body.timelines.posts.length.should.eql(1)
              res.body.should.have.property('posts')
              res.body.posts.length.should.eql(1)
              res.body.posts[0].body.should.eql(body)
              done()
            })
        })
    })
  })

  describe('#posts()', function() {
    var username = 'Luna'
    var authToken
      , post

    beforeEach(funcTestHelper.createUser(username, 'password', function(token) {
      authToken = token
    }))

    beforeEach(function(done) {
      var body = 'Post body'

      request
          .post(app.config.host + '/v1/posts')
          .send({ post: { body: body }, authToken: authToken })
          .end(function(err, res) {
            res.body.should.not.be.empty
            res.body.should.have.property('posts')
            res.body.posts.should.have.property('body')
            res.body.posts.body.should.eql(body)

            post = res.body.posts

            done()
          })
    })

    it('should return posts timeline', function(done) {
      funcTestHelper.getTimeline('/v1/timelines/' + username, authToken, function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('timelines')
          res.body.timelines.should.have.property('name')
          res.body.timelines.name.should.eql('Posts')
          res.body.timelines.should.have.property('posts')
          res.body.timelines.posts.length.should.eql(1)
          res.body.should.have.property('posts')
          res.body.posts.length.should.eql(1)
          res.body.posts[0].body.should.eql(post.body)
          done()
        })
    })
  })

  describe('#likes()', function() {
    var username = 'Luna'
    var authToken
      , post

    beforeEach(funcTestHelper.createUser(username, 'password', function(token) {
      authToken = token
    }))

    beforeEach(function(done) {
      var body = 'Post body'

      request
        .post(app.config.host + '/v1/posts')
        .send({ post: { body: body }, authToken: authToken })
        .end(function(err, res) {
          post = res.body.posts

          request
            .post(app.config.host + '/v1/posts/' + post.id + '/like')
            .send({ authToken: authToken })
            .end(function(req, res) {
              done()
            })
        })
    })

    it('should return likes timeline', function(done) {
      funcTestHelper.getTimeline('/v1/timelines/' + username + '/likes', authToken, function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('timelines')
          res.body.timelines.should.have.property('name')
          res.body.timelines.name.should.eql('Likes')
          res.body.timelines.should.have.property('posts')
          res.body.timelines.posts.length.should.eql(1)
          res.body.should.have.property('posts')
          res.body.posts.length.should.eql(1)
          res.body.posts[0].body.should.eql(post.body)
          done()
        })
    })

    it('should return empty likes timeline after un-like', function(done) {
      request
        .post(app.config.host + '/v1/posts/' + post.id + '/unlike')
        .send({ authToken: authToken })
        .end(function(req, res) {
          funcTestHelper.getTimeline('/v1/timelines/' + username + '/likes', authToken, function(err, res) {
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

  })

  describe('#comments()', function() {
    var username = 'Luna'
    var authToken
      , user
      , post
      , comment
      , comment2

    beforeEach(funcTestHelper.createUser(username, 'password', function(token) {
      authToken = token
    }))

    beforeEach(function(done) {
      var body = 'Post body'

      request
        .post(app.config.host + '/v1/posts')
        .send({ post: { body: body }, authToken: authToken })
        .end(function(err, res) {
          post = res.body.posts

          var body = "Comment"

          funcTestHelper.createComment(body, post.id, authToken, function(err, res) {
            comment = res.body.comments

            funcTestHelper.createComment(body, post.id, authToken, function(err, res) {
              comment2 = res.body.comments

              done()
            })

          })
        })
    })

    it('should return comments timeline', function(done) {
      funcTestHelper.getTimeline('/v1/timelines/' + username + '/comments', authToken, function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('timelines')
          res.body.timelines.should.have.property('name')
          res.body.timelines.name.should.eql('Comments')
          res.body.timelines.should.have.property('posts')
          res.body.timelines.posts.length.should.eql(1)
          res.body.should.have.property('posts')
          res.body.posts.length.should.eql(1)
          res.body.posts[0].body.should.eql(post.body)
          done()
        })
    })


    it('should clear comments timeline only after all comments are deleted', function(done) {

      funcTestHelper.removeComment(comment.id, authToken, function(err, res) {
        res.body.should.be.empty
        res.status.should.eql(200)

        funcTestHelper.getTimeline('/v1/timelines/' + username + '/comments', authToken, function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('timelines')
          res.body.timelines.should.have.property('name')
          res.body.timelines.name.should.eql('Comments')
          res.body.timelines.should.have.property('posts')
          res.body.timelines.posts.length.should.eql(1)
          res.body.should.have.property('posts')
          res.body.posts.length.should.eql(1)
          res.body.posts[0].body.should.eql(post.body)

          // now remove 2nd comment
          funcTestHelper.removeComment(comment2.id, authToken, function(err, res) {
            res.body.should.be.empty
            res.status.should.eql(200)

            funcTestHelper.getTimeline('/v1/timelines/' + username + '/comments', authToken, function(err, res) {
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

      })

    })

  })
})
