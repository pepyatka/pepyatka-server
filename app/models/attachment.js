"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , config = require('../../config/config').load()
  , gm = require('gm')
  , fs = require('fs')
  , inherits = require('util').inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , Post = models.Post
  , mkKey = require('../support/models').mkKey

exports.addModel = function(database) {
  /**
   * @constructor
   */
  var Attachment = function(params) {
    Attachment.super_.call(this)

    this.id = params.id
    this.file = params.file // FormData File object
    this.fileName = params.fileName // original file name, e.g. 'cute-little-kitten.jpg'
    this.fileSize = params.fileSize // file size in bytes
    this.mimeType = params.mimeType // mime type, e.g. 'image/jpeg'
    this.fileExtension = params.fileExtension // jpg|png|gif etc.
    this.noThumbnail = params.noThumbnail // if true, image thumbnail URL == original URL

    this.userId = params.userId
    this.postId = params.postId

    if (parseInt(params.createdAt, 10))
      this.createdAt = params.createdAt
    if (parseInt(params.updatedAt, 10))
      this.updatedAt = params.updatedAt
  }

  inherits(Attachment, AbstractModel)

  Attachment.className = Attachment
  Attachment.namespace = 'attachment'
  Attachment.findById = Attachment.super_.findById

  Attachment.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid = this.file
        && Object.keys(this.file).length > 0
        && this.file.path
        && this.file.path.length > 0
        && this.userId
        && this.userId.length > 0

      if (valid) {
        resolve(valid)
      } else {
        reject(new Error('Invalid'))
      }
    }.bind(this))
  }

  Attachment.prototype.validateOnCreate = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      Promise.join(that.validate(),
                   that.validateUniquness(mkKey(['attachment', that.id])),
                   function(valid, idIsUnique) {
                     resolve(that)
                   })
        .catch(function(e) { reject(e) })
      })
  }

  Attachment.prototype.create = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.createdAt = new Date().getTime()
      that.updatedAt = new Date().getTime()
      that.postId = that.postId || ''
      that.id = uuid.v4()

      that.validateOnCreate()
        // Save file to FS
        .then(function(attachment) {
          attachment.fileName = attachment.file.name
          attachment.fileSize = attachment.file.size
          attachment.mimeType = attachment.file.type

          var supportedExtensions = /\.(jpe?g|png|gif)$/
          if (attachment.fileName && attachment.fileName.match(supportedExtensions).length !== null) {
            attachment.fileExtension = attachment.fileName.match(supportedExtensions)[1]
          } else {
            attachment.fileExtension = null
          }

          return that.handleMedia(attachment)
        })
        // Save record to DB
        .then(function(attachment) {
          var params = {
            fileName: attachment.fileName,
            fileSize: attachment.fileSize,
            mimeType: attachment.mimeType,
            fileExtension: attachment.fileExtension,
            noThumbnail: attachment.noThumbnail,
            userId: attachment.userId,
            postId: attachment.postId,
            createdAt: attachment.createdAt.toString(),
            updatedAt: attachment.updatedAt.toString()
          }
          return database.hmsetAsync(mkKey(['attachment', attachment.id]), params)
        })
        .then(function(res) { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  // Get user who created the attachment (via Promise, for serializer)
  Attachment.prototype.getCreatedBy = function() {
    return models.FeedFactory.findById(this.userId)
  }

  // Get public URL of attachment (via Promise, for serializer)
  Attachment.prototype.getUrl = function() {
    var that = this
    return new Promise(function(resolve, reject) {
      resolve(config.attachments.urlDir + that.getFilename())
    })
  }

  // Get public URL of attachment's thumbnail (via Promise, for serializer)
  Attachment.prototype.getThumbnailUrl = function() {
    var that = this
    return new Promise(function(resolve, reject) {
      if (that.noThumbnail === '1') {
        resolve(that.getUrl())
      } else {
        resolve(config.attachments.thumbnails.urlDir + that.getFilename())
      }
    })
  }

  // Get local filesystem path for original file
  Attachment.prototype.getPath = function() {
    return config.attachments.fsDir + this.getFilename()
  }

  // Get local filesystem path for thumbnail file
  Attachment.prototype.getThumbnailPath = function() {
    return config.attachments.thumbnails.fsDir + this.getFilename()
  }

  // Get file name
  Attachment.prototype.getFilename = function() {
    if (this.fileExtension) {
      return this.id + '.' + this.fileExtension
    }
    return this.id
  }

  // Rename file and process thumbnail, if necessary
  Attachment.prototype.handleMedia = function(attachment) {
    var that = this

    return new Promise(function(resolve, reject) {
      var tmpPath = that.file.path
      var originalPath = that.getPath()

      fs.rename(tmpPath, originalPath, function(err) {
        if (err) {
          reject(err)
          return
        }
        if ('image') { // TODO: support for various media types
          gm(originalPath).size(function (err, size) {
            // Check if we need to resize
            if (size !== undefined && (size.width > 525 || size.height > 175)) {
              // Looks big enough, needs a resize
              that.noThumbnail = '0'
              gm(originalPath)
                .resize(525, 175)
                .write(that.getThumbnailPath(), function (err) {
                  if (err) {
                    reject(err)
                  }
                  // Thumbnail has been resized and stored successfully
                  resolve(attachment)
                })
            } else {
              // Since it's small, just use the same URL as a original image
              that.noThumbnail = '1'
              resolve(attachment)
            }
          })
        }
      })
    })
  }

  return Attachment
}
