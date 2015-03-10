var models = require("../../app/models")
  , Comment = models.Comment

describe('Comment', function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe('#create()', function() {
    it('should create without error', function(done) {
      var comment = new Comment({
        body: 'Comment body',
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
        , comment = new Comment({
          body: body,
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
      })

      comment.create()
        .catch(function(e) {
          e.message.should.eql("Invalid")
        })
        .then(function() { done() })
    })
  })

  describe('#findById()', function() {
    it('should find comment with a valid id', function(done) {
      var comment = new Comment({
        body: 'Comment body',
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
})
