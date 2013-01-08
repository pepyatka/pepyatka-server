var uuid = require('node-uuid')
  , models = require('../models');

exports.addModel = function(db) {
  function Attachment(params) {
    console.log('new Attachment(' + JSON.stringify(params) + ')')

    this.id = params.id

    this.ext = params.ext
    // this.filetype = params.filetype // TODO: mmmagic lib
    this.filename = params.filename
    this.path = params.path
    this.postId = params.postId

    if (params.thumbnailId)
      this.thumbnailId = params.thumbnailId
    if (params.thumbnail)
      this.thumbnail = params.thumbnail
  }

  Attachment.find = function(attachmentId, callback) {
    console.log('Attachment.find("' + attachmentId + '")')
    db.hgetall('attachment:' + attachmentId, function(err, attrs) {
      // TODO: check if we find a attachment
      attrs.id = attachmentId
      var attachment = new Attachment(attrs)
      return callback(attachment)
    })
  },

  Attachment.prototype = {
    save: function(callback) {
      console.log('- attachment.save()')
      var that = this

      if (this.id === undefined) this.id = uuid.v4()

      // TODO: async.parallel([], function() { ... })
      db.multi()
        .hset('attachment:' + this.id, 'ext', this.ext)
        .hset('attachment:' + this.id, 'filename', this.filename)
        .hset('attachment:' + this.id, 'path', this.path)
        .hset('attachment:' + this.id, 'postId', this.postId)
        // if it's null just skip it
        .hset('attachment:' + this.id, 'thumbnailId', this.thumbnailId)
        .exec(function(err, res) {
          models.Post.addAttachment(that.postId, that.id, function() {
            return callback(that)
          }) 
        })      
    },
    
    toJSON: function(callback) {
      console.log('- attachment.toJSON()')

      var attrs = {
        id: this.id,
        ext: this.ext,
        filename: this.filename,
        path: this.path
      }

      // TODO: temp solution to skip parent images
      if (this.thumbnailId && this.thumbnailId != 'undefined') {
        models.Attachment.find(this.thumbnailId, function(thumbnail) {
          attrs['thumbnail'] = {
            id: thumbnail.id,
            ext: thumbnail.ext,
            filename: thumbnail.filename,
            path: thumbnail.path
          }
          return callback(attrs)
        })
      } else { 
        return callback(attrs)
      }
    }

  }
  
  return Attachment;
}
