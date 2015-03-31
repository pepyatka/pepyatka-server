var models = require("../../app/models")

describe('Attachment', function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe('#create()', function() {
    var user
      , post

    beforeEach(function(done) {
      user = new models.User({
        username: 'Luna',
        password: 'password'
      })

      var postAttrs = { body: 'Post body' }

      user.create()
        .then(function(user) { return user.newPost(postAttrs) })
        .then(function(newPost) { return newPost.create() })
        .then(function(newPost) {
          post = newPost
          done()
        })
    })

    it('should create an attachment', function(done) {
      var attachment = new models.Attachment({
        filename: 'filename.jpg',
        isImage: '1',
        postId: post.id,
        userId: user.id
      })

      attachment.create()
        .then(function(newAttachment) {
          newAttachment.should.be.an.instanceOf(models.Attachment)
          newAttachment.should.not.be.empty
          newAttachment.should.have.property('id')

          return models.Attachment.findById(attachment.id)
        }).then(function(newAttachment) {
          newAttachment.should.be.an.instanceOf(models.Attachment)
          newAttachment.should.not.be.empty
          newAttachment.should.have.property('id')
          newAttachment.id.should.eql(attachment.id)
        })
        .then(function() { done() })
    })
  })

  describe('#destroy()', function() {
    var user
      , post
      , attachment

    beforeEach(function(done) {
      user = new models.User({
        username: 'Luna',
        password: 'password'
      })

      var postAttrs = { body: 'Post body' }

      user.create()
        .then(function(user) { return user.newPost(postAttrs) })
        .then(function(newPost) { return newPost.create() })
        .then(function(newPost) {
          post = newPost

          attachment = new models.Attachment({
            filename: 'filename.jpg',
            isImage: '1',
            postId: post.id,
            userId: user.id
          })

          return attachment.create()
        })
        .then(function(attachment) {
          done() })
    })

    it('should destroy an attachment', function(done) {
      attachment.destroy()
        .then(function() { return models.Attachment.findById(attachment.id) })
        .then(function(attachment) {
          (attachment === null).should.be.true
          done()
        })
    })
  })
})
