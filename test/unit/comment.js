var models = require("../../app/models")
  , Comment = models.Comment
  , User = models.User
  , Post = models.Post

describe('Comment', function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe('#update()', function() {
    var userA
      , comment
      , post

    beforeEach(function(done) {
      userA = new User({
        username: 'Luna',
        password: 'password'
      })

      var postAttrs = { body: 'Post body' }

      userA.create()
        .then(function(user) { return userA.newPost(postAttrs) })
        .then(function(newPost) { return newPost.create() })
        .then(function(newPost) {
          post = newPost
          var commentAttrs = {
            body: 'Comment body',
            postId: post.id
          }
          return userA.newComment(commentAttrs)
        })
        .then(function(comment) { return comment.create() })
        .then(function(newComment) {
          comment = newComment
          return post.addComment(comment.id)
        })
        .then(function(res) { done() })
    })

    it('should update without error', function(done) {
      body = 'Body'
      attrs = {
        body: body
      }

      comment.update(attrs)
        .then(function(newComment) {
          newComment.should.be.an.instanceOf(Comment)
          newComment.should.not.be.empty
          newComment.should.have.property('body')
          newComment.body.should.eql(comment.body)
        })
        .then(function() { done() })
    })
  })

  describe('#create()', function() {
    var user
      , post

    beforeEach(function(done) {
      user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) {
          post = new Post({
            body: 'Post body',
            userId: user.id
          })

          return post.create()
        })
        .then(function() { done() })
    })

    it('should create without error', function(done) {
      var comment = new Comment({
        body: 'Comment body',
        userId: user.id,
        postId: post.id
      })

      comment.create()
        .then(function(comment) {
          comment.should.be.an.instanceOf(Comment)
          comment.should.not.be.empty
          comment.should.have.property('id')

          return comment
        })
        .then(function(comment) { return Comment.findById(comment.id) })
        .then(function(newComment) {
          newComment.should.be.an.instanceOf(Comment)
          newComment.should.not.be.empty
          newComment.should.have.property('id')
          newComment.id.should.eql(comment.id)
        })
        .then(function() { done() })
    })

    it('should ignore whitespaces in body', function(done) {
      var body = '   Comment body    '
      var comment = new Comment({
          body: body,
          userId: user.id,
          postId: post.id
        })

      comment.create()
        .then(function(comment) { return comment })
        .then(function(comment) { return Comment.findById(comment.id) })
        .then(function(newComment) {
          newComment.should.be.an.instanceOf(Comment)
          newComment.should.not.be.empty
          newComment.should.have.property('id')
          newComment.id.should.eql(comment.id)
          newComment.body.should.eql(body.trim())
        })
        .then(function() { done() })
    })

    it('should not create with empty body', function(done) {
      var comment = new Comment({
        body: '',
        userId: user.id,
        postId: post.id
      })

      comment.create()
        .catch(function(e) {
          e.message.should.eql("Invalid")
        })
        .then(function() { done() })
    })
  })

  describe('#findById()', function() {
    var user
      , post

    beforeEach(function(done) {
      user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) {
          post = new Post({
            body: 'Post body',
            userId: user.id
          })

          return post.create()
        })
        .then(function() { done() })
    })

    it('should find comment with a valid id', function(done) {
      var comment = new Comment({
        body: 'Comment body',
        userId: user.id,
        postId: post.id
      })

      comment.create()
        .then(function(comment) { return comment })
        .then(function(comment) { return Comment.findById(comment.id) })
        .then(function(newComment) {
          newComment.should.be.an.instanceOf(Comment)
          newComment.should.not.be.empty
          newComment.should.have.property('id')
          newComment.id.should.eql(comment.id)
        })
        .then(function() { done() })
    })

    it('should not find comment with a valid id', function(done) {
      var identifier = "comment:identifier"

      Comment.findById(identifier)
        .then(function(comment) {
          $should.not.exist(comment)
        })
        .then(function() { done() })
    })
  })

  describe('#destroy()', function() {
    var userA
      , post
      , comment

    beforeEach(function(done) {
      userA = new User({
        username: 'Luna',
        password: 'password'
      })

      var postAttrs = { body: 'Post body' }

      userA.create()
        .then(function(user) { return userA.newPost(postAttrs) })
        .then(function(newPost) { return newPost.create() })
        .then(function(newPost) {
          post = newPost
          var commentAttrs = {
            body: 'Comment body',
            postId: post.id
          }
          return userA.newComment(commentAttrs)
        })
        .then(function(comment) { return comment.create() })
        .then(function(newComment) {
          comment = newComment
          return post.addComment(comment.id)
        })
        .then(function(res) { done() })
    })

    it('should destroy comment', function(done) {
      post.getComments()
        .then(function(comments) { return comments[0].destroy() })
        .then(function() { return post.getComments() })
        .then(function(comments) {
          comments.should.be.empty
        })
        .then(function() { done() })
    })
  })
})
