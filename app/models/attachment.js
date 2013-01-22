var uuid = require('node-uuid')
  // XXX: do not like the idea of requiring all the models than we
  // need just one or may be two of them, however it's a oneliner.
  , models = require('../models')
  , fs = require('fs')

exports.addModel = function(db) {
  function Attachment(params) {
    this.id = params.id
    this.mimeType = params.mimeType // TODO: mmmagic lib
    this.ext = params.ext
    this.filename = params.filename
    this.path = params.path
    this.fsPath = params.fsPath
    this.postId = params.postId

    if (parseInt(params.createdAt))
      this.createdAt = parseInt(params.createdAt)
    if (parseInt(params.updatedAt))
      this.updatedAt = parseInt(params.updatedAt)

    if (params.thumbnailId)
      this.thumbnailId = params.thumbnailId
  }
  
  Attachment.findById = function(attachmentId, callback) {
    db.hgetall('attachment:' + attachmentId, function(err, attrs) {
      // TODO: check if we find an attachment
      attrs.id = attachmentId
      var attachment = new Attachment(attrs)
      callback(err, attachment)
    })
  },

  // TODO: attachmentId -> attachmentsId
  Attachment.destroy = function(attachmentId, callback) {
    models.Attachment.findById(attachmentId, function(err, attachment) {
      if (attachment.fsPath) {
        fs.unlink(attachment.fsPath, function(err) {
          db.del('attachment:' + attachment.id, function(err, res) {
            callback(err, res)
          })
        })
      }
    })
  }

  Attachment.prototype = {
    save: function(callback) {
      var that = this

      if (this.id === undefined) this.id = uuid.v4()

      var params = { 'ext': this.ext.toString(),
                 'filename': this.filename.toString(),
                 'path': this.path.toString(),
                 'fsPath': this.fsPath.toString(),
               }

      if (this.thumbnailId) {
        this.thumbnailId = this.thumbnailId.toString()
        params['thumbnailId'] = this.thumbnailId
      }

      if (this.postId) {
        this.postId = this.postId.toString()
        params['postId'] = this.postId.toString()
      }

      // TODO: check if postId exists before saving attachment object
      db.hmset('attachment:' + this.id, params, function(err, res) {
        if (that.postId) {
          models.Post.addAttachment(that.postId, that.id, function(err, count) {
            callback(err, that)
          })
        } else {
          callback(null, that)
        }
      })
    },
    
    toJSON: function(callback) {
      var attrs = {
        id: this.id,
        ext: this.ext,
        filename: this.filename,
        path: this.path
      }

      if (this.thumbnailId) {
        models.Attachment.findById(this.thumbnailId, function(err, thumbnail) {
          attrs['thumbnail'] = {
            id: thumbnail.id,
            ext: thumbnail.ext,
            filename: thumbnail.filename,
            path: thumbnail.path
          }
          callback(err, attrs)
        })
      } else { 
        callback(null, attrs)
      }
    }

  }
  
  return Attachment;
}
