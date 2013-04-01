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
    this.filename = params.filename || ""
    this.path = params.path || ""
    this.fsPath = params.fsPath || ""
    this.postId = params.postId

    if (parseInt(params.createdAt, 10))
      this.createdAt = parseInt(params.createdAt, 10)
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = parseInt(params.updatedAt, 10)

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
    validate: function(callback) {
      var that = this

      db.exists('post:' + that.postId, function(err, postExists) {
        db.exists('attachment' + that.id, function(err, attachmentExists) {
          // TODO: dirty. we do an extra request to our db
          callback((postExists === 1 || that.postId === undefined) &&
                   attachmentExists === 0 &&
                   that.filename.trim().length > 0 &&
                   that.path.trim().length > 0 &&
                   that.fsPath.trim().length > 0)

        })
      })
    },

    save: function(callback) {
      var that = this

      if (this.id === undefined) this.id = uuid.v4()

      var params = { 'ext': this.ext.toString(),
                     'filename': this.filename.toString(),
                     'path': this.path.toString(),
                     'fsPath': this.fsPath.toString()
                   }

      if (this.thumbnailId) {
        this.thumbnailId = this.thumbnailId.toString()
        params['thumbnailId'] = this.thumbnailId
      }

      if (this.postId) {
        this.postId = this.postId.toString()
        params['postId'] = this.postId.toString()
      }

      this.validate(function(valid) {
        if (valid) {
          db.hmset('attachment:' + that.id, params, function(err, res) {
            if (that.postId) {
              models.Post.addAttachment(that.postId, that.id, function(err, count) {
                callback(err, that)
              })
            } else {
              callback(null, that)
            }
          })
        } else {
          callback(1, that)
        }
      })
    },
    
    toJSON: function(callback) {
      var attrs = {
        id: this.id,
        // ext: this.ext,
        // filename: this.filename,
        path: this.path
      }

      if (this.thumbnailId) {
        models.Attachment.findById(this.thumbnailId, function(err, thumbnail) {
          attrs['thumbnail'] = {
            id: thumbnail.id,
            // ext: thumbnail.ext,
            // filename: thumbnail.filename,
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
