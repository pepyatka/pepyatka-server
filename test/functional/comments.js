var request = require('superagent')
  , app = require('../../index')
  , models = require('../../app/models')
  , funcTestHelper = require('./functional_test_helper')

describe("CommentsController", function() {
  beforeEach(funcTestHelper.flushDb())

  describe('#create()', function() {
    var post
      , context = {}

    beforeEach(funcTestHelper.createUserCtx(context, 'Luna', 'password'))
    beforeEach(funcTestHelper.createPost(context, 'Post body'))

    describe('in a group', function() {
      var groupName = 'pepyatka-dev'

      beforeEach(function(done) {
        var screenName = 'Pepyatka Developers';
        request
          .post(app.config.host + '/v1/groups')
          .send({ group: { username: groupName, screenName: screenName },
                  authToken: context.authToken })
          .end(function(err, res) {
            done()
          })
      })

      it("should not update group's last activity", function(done) {
        var body = 'Post body'

        request
          .post(app.config.host + '/v1/posts')
          .send({ post: { body: body }, meta: { feeds: [groupName] }, authToken: context.authToken })
          .end(function(err, res) {
            res.status.should.eql(200)
            var postB = res.body.posts
            funcTestHelper.getTimeline('/v1/users/' + groupName, context.authToken, function(err, res) {
              res.status.should.eql(200)
              var lastUpdatedAt = res.body.users.updatedAt

              funcTestHelper.createComment(body, postB.id, context.authToken, function(err, res) {
                res.status.should.eql(200)
                funcTestHelper.getTimeline('/v1/users/' + groupName, context.authToken, function(err, res) {
                  res.status.should.eql(200)
                  res.body.should.have.property('users')
                  res.body.users.should.have.property('updatedAt')
                  lastUpdatedAt.should.be.lt(res.body.users.updatedAt)

                  done()
                })
              })
            })
          })
      })
    })

    it('should create a comment with a valid user', function(done) {
      var body = 'Comment'

      funcTestHelper.createCommentCtx(context, body)(function(err, res) {
        res.body.should.not.be.empty
        res.body.should.have.property('comments')
        res.body.comments.should.have.property('body')
        res.body.comments.body.should.eql(body)

        done()
      })
    })

    it('should not create a comment for an invalid user', function(done) {
      var body = "Comment"

      context.authToken = 'token'
      funcTestHelper.createCommentCtx(context, body)(function(err, res) {
        err.should.not.be.empty
        err.status.should.eql(401)

        done()
      })
    })

    it('should not create a comment for an invalid post', function(done) {
      var body = "Comment"

      context.post.id = 'id'
      funcTestHelper.createCommentCtx(context, body)(function(err, res) {
        err.should.not.be.empty
        err.status.should.eql(422)

        done()
      })
    })
  })

  describe('#update()', function() {
    var lunaContext = {}
      , yoleContext = {}

    beforeEach(funcTestHelper.createUserCtx(lunaContext, 'Luna', 'password'))
    beforeEach(funcTestHelper.createUserCtx(yoleContext, 'yole', 'pw'))

    beforeEach(function(done) { funcTestHelper.createPost(lunaContext, 'post body')(done) })
    beforeEach(function(done) { funcTestHelper.createCommentCtx(lunaContext, 'comment')(done) })

    it('should update a comment with a valid user', function(done) {
      var newBody = "New body"
      request
        .post(app.config.host + '/v1/comments/' + lunaContext.comment.id)
        .send({ comment: { body: newBody },
                authToken: lunaContext.authToken,
                '_method': 'put'
              })
        .end(function(err, res) {
          res.body.should.not.be.empty
          res.body.should.have.property('comments')
          res.body.comments.should.have.property('body')
          res.body.comments.body.should.eql(newBody)

          done()
        })
    })

    it('should not update a comment with a invalid user', function(done) {
      var newBody = "New body"
      request
        .post(app.config.host + '/v1/comments/' + lunaContext.comment.id)
        .send({ comment: { body: newBody },
                '_method': 'put'
              })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)

          done()
        })
    })

    it("should not update another user's comment", function(done) {
      var newBody = "New body"
      request
          .post(app.config.host + '/v1/comments/' + lunaContext.comment.id)
          .send({ comment: { body: newBody },
            authToken: yoleContext.authToken,
            '_method': 'put'
          })
          .end(function(err, res) {
            err.status.should.eql(403)
            done()
          })
    })
  })

  describe('#destroy()', function() {
    var lunaContext = {}
      , yoleContext = {}

    beforeEach(funcTestHelper.createUserCtx(lunaContext, 'Luna', 'password'))
    beforeEach(funcTestHelper.createUserCtx(yoleContext, 'yole', 'pw'))

    beforeEach(function(done) { funcTestHelper.createPost(lunaContext, 'Post body')(done) })
    beforeEach(function(done) { funcTestHelper.createCommentCtx(lunaContext, 'Comment')(done) })

    it('should destroy valid comment', function(done) {
      funcTestHelper.removeComment(lunaContext.comment.id, lunaContext.authToken, function(err, res) {
        res.body.should.be.empty
        res.status.should.eql(200)

        request
          .get(app.config.host + '/v1/posts/' + lunaContext.post.id)
          .query({ authToken: lunaContext.authToken })
          .end(function(err, res) {
            res.should.not.be.empty
            res.body.should.not.be.empty
            res.body.should.have.property('posts')
            res.body.posts.should.not.have.property('comments')
            done()
          })
      })
    })

    it('should not destroy valid comment without user', function(done) {
      request
        .post(app.config.host + '/v1/comments/' + lunaContext.comment.id)
        .send({
          '_method': 'delete'
        })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(401)
          done()
        })
    })

    it("should not destroy another user's comment", function(done) {
      request
        .post(app.config.host + '/v1/comments/' + lunaContext.comment.id)
        .query({ authToken: yoleContext.authToken })
        .send({
          '_method': 'delete'
        })
        .end(function(err, res) {
          err.should.not.be.empty
          err.status.should.eql(403)
          done()
        })
    })
  })
})
