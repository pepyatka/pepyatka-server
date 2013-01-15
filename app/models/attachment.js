var uuid = require('node-uuid')
  // XXX: do not like the idea of requiring all the models than we
  // need just one or may be two of them, however it's a oneliner.
  , models = require('../models')
  , fs = require('fs')
  , logger = require('../../logger').create()

exports.addModel = function(db) {
  function Attachment(params) {
    // XXX: well... current logger is awful.
    logger.debug('new Attachment(' + JSON.stringify(params) + ')')

    this.id = params.id

    // this.mimeType = params.filetype // TODO: mmmagic lib
    this.ext = params.ext
    this.filename = params.filename
    this.path = params.path
    this.fsPath = params.fsPath
    this.postId = params.postId

    // XXX: workaround
    if (params.thumbnailId)
      this.thumbnailId = params.thumbnailId
    if (params.thumbnail)
      this.thumbnail = params.thumbnail
  }
  
  Attachment.find = function(attachmentId, callback) {
    logger.debug('Attachment.find("' + attachmentId + '")')
    db.hgetall('attachment:' + attachmentId, function(err, attrs) {
      // TODO: check if we find an attachment
      attrs.id = attachmentId
      var attachment = new Attachment(attrs)
      callback(attachment)
    })
  },

  // TODO: attachmentId -> attachmentsId
  Attachment.destroy = function(attachmentId, callback) {
    logger.debug('Attachment.destroy("' + attachmentId + '")')
    models.Attachment.find(attachmentId, function(attachment) {
      // workaround since we are schemaless
      if (attachment.fsPath) {
        fs.unlink(attachment.fsPath, function(err) {
          db.del('attachment:' + attachment.id, function(err, res) {
            callback(err, res)
          })
        })
      } else {
        db.del('attachment:' + attachment.id, function(err, res) {
          callback(err, res)
        })
      }
    })
  }

  Attachment.prototype = {
    save: function(callback) {
      logger.debug('- attachment.save()')
      var that = this

      if (this.id === undefined) this.id = uuid.v4()

      // TODO: workaround
      if (this.thumbnailId) 
        this.thumbnailId = this.thumbnailId.toString()
      else
        this.thumbnailId = "undefined"

      if (this.postId) 
        this.postId = this.postId.toString()
      else
        this.postId = "undefined"

      // TODO: check if postId exists before saving attachment object
      db.hmset('attachment:' + this.id,
               { 'ext': this.ext.toString(),
                 'filename': this.filename.toString(),
                 'path': this.path.toString(),
                 // if it's null just skip it - currently works with workaround
                 'postId': this.postId.toString(),
                 'fsPath': this.fsPath.toString(),
                 // if it's null just skip it - currently works with workaround
                 'thumbnailId': this.thumbnailId
               }, function(err, res) {
                 if (that.postId) {
                   models.Post.addAttachment(that.postId, that.id, function() {
                     callback(that)
                   })
                 } else {
                   // TODO: workaround - please read above
                   callback(that)
                 }
               })
    },
    
    toJSON: function(callback) {
      logger.debug('- attachment.toJSON()')

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
          callback(attrs)
        })
      } else { 
        callback(attrs)
      }
    }

  }
  
  return Attachment;
}
