var models = require('../../app/models')
  , config = require('../../config/config').load()
  , fs = require('fs')
  , mkdirp = require('mkdirp')

describe('Attachment', function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe('#create()', function() {
    var user
      , post
      , file
      , fileContents

    beforeEach(function(done) {
      user = new models.User({
        username: 'Luna',
        password: 'password'
      })

      // FormData file object
      file = {
        size: 43,
        path: '/tmp/upload_12345678901234567890123456789012',
        name: 'tiny.gif',
        type: 'image/gif'
      }

      // Base64-encoded contents of a tiny GIF file
      fileContents = 'R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

      var postAttrs = { body: 'Post body' }

      user.create()
        .then(function(user) { return user.newPost(postAttrs) })
        .then(function(newPost) { return newPost.create() })
        .then(function(newPost) { post = newPost })
        .then(function() {
          // Create directories for attachments
          mkdirp.sync(config.attachments.fsDir)
          mkdirp.sync(config.attachments.thumbnails.fsDir)
        })
        .then(function() {
          // "Upload" tiny GIF image
          var imageBuffer = new Buffer(fileContents, 'base64')
          fs.writeFile(file.path, imageBuffer, function () {
            done()
          })
        })
    })

    it('should create an attachment', function(done) {
      var attachment = new models.Attachment({
        file: file,
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
          return newAttachment
        }).then(function(newAttachment) {
          newAttachment.should.have.a.property('mediaType')
          newAttachment.mediaType.should.be.equal('image')

          newAttachment.should.have.a.property('fileName')
          newAttachment.fileName.should.be.equal(file.name)

          newAttachment.should.have.a.property('fileSize')
          newAttachment.fileSize.should.be.equal(file.size.toString())

          newAttachment.should.have.a.property('mimeType')
          newAttachment.mimeType.should.be.equal(file.type)

          newAttachment.should.have.a.property('fileExtension')
          newAttachment.fileExtension.should.be.equal(file.name.match(/\.(\w+)$/)[1])

          newAttachment.should.have.a.property('noThumbnail')
          newAttachment.noThumbnail.should.be.equal('1')

          newAttachment.getPath().should.be.equal(config.attachments.fsDir + newAttachment.id + '.' + newAttachment.fileExtension)
          fs.stat(newAttachment.getPath(), function(err, stats) {
            stats.size.should.be.equal(file.size)
            done()
          })
        }).catch(function(e) { done(e) })
    })
  })
})
