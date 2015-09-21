"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , mmm = require('mmmagic')
  , meta = require('musicmetadata')
  , _ = require('lodash')
  , config = require('../../config/config').load()
  , gm = require('gm')
  , fs = Promise.promisifyAll(require('fs'))
  , inherits = require('util').inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , Post = models.Post
  , mkKey = require('../support/models').mkKey
  , aws = require('aws-sdk')

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
    this.mimeType = params.mimeType // used as a fallback, in case we can't detect proper one
    this.fileExtension = params.fileExtension // jpg|png|gif etc.
    this.noThumbnail = params.noThumbnail // if true, image thumbnail URL == original URL
    this.mediaType = params.mediaType // image | audio | general

    this.artist = params.artist  // filled only for audio
    this.title = params.title   // filled only for audio

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

  Attachment.prototype.validate = async function() {
    var valid = this.file
        && Object.keys(this.file).length > 0
        && this.file.path
        && this.file.path.length > 0
        && this.userId
        && this.userId.length > 0

    if (!valid)
      throw new Error('Invalid')

    return true
  }

  Attachment.prototype.validateOnCreate = async function() {
    var promises = [
      this.validate(),
      this.validateUniquness(mkKey(['attachment', this.id]))
    ]

    await* promises

    return this
  }

  Attachment.prototype.create = function() {
    var that = this

    return new Promise(function(resolve, reject) {
      that.createdAt = new Date().getTime()
      that.updatedAt = new Date().getTime()
      that.postId = that.postId || ''
      that.id = uuid.v4()

      that.validateOnCreate()
        // Save file to FS or S3
        .then(function(attachment) {
          attachment.fileName = attachment.file.name
          attachment.fileSize = attachment.file.size
          attachment.mimeType = attachment.file.type

          // Determine initial file extension
          // (it might be overridden later when we know MIME type from its contents)
          // TODO: extract to config
          var supportedExtensions = /\.(jpe?g|png|gif|mp3|m4a|ogg|wav|txt|pdf|docx?|pptx?|xlsx?)$/i

          if (attachment.fileName && attachment.fileName.match(supportedExtensions) !== null) {
            attachment.fileExtension = attachment.fileName.match(supportedExtensions)[1].toLowerCase()
          } else {
            attachment.fileExtension = ''
          }

          return that.handleMedia(attachment)
        })
        // Save record to DB
        .then(function(attachment) {
          var params = {
            fileName: attachment.fileName,
            fileSize: attachment.fileSize,
            mimeType: attachment.mimeType,
            mediaType: attachment.mediaType,
            fileExtension: attachment.fileExtension,
            noThumbnail: attachment.noThumbnail,
            userId: attachment.userId,
            postId: attachment.postId,
            createdAt: attachment.createdAt.toString(),
            updatedAt: attachment.updatedAt.toString()
          }

          if (attachment.mediaType === 'audio') {
            params.artist = attachment.artist
            params.title = attachment.title
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
      resolve(config.attachments.url + config.attachments.path + that.getFilename())
    })
  }

  // Get public URL of attachment's thumbnail (via Promise, for serializer)
  Attachment.prototype.getThumbnailUrl = function() {
    var that = this
    return new Promise(function(resolve, reject) {
      if (that.noThumbnail === '1') {
        resolve(that.getUrl())
      } else {
        resolve(config.thumbnails.url + config.thumbnails.path + that.getFilename())
      }
    })
  }

  // Get local filesystem path for original file
  Attachment.prototype.getPath = function() {
    return config.attachments.storage.rootDir + config.attachments.path + this.getFilename()
  }

  // Get local filesystem path for thumbnail file
  Attachment.prototype.getThumbnailPath = function() {
    return config.thumbnails.storage.rootDir + config.thumbnails.path + this.getFilename()
  }

  // Get file name
  Attachment.prototype.getFilename = function() {
    if (this.fileExtension) {
      return this.id + '.' + this.fileExtension
    }
    return this.id
  }

  // Store the file and process its thumbnail, if necessary
  Attachment.prototype.handleMedia = async function(attachment) {
    var tmpAttachmentFile = this.file.path
    var tmpThumbnailFile = tmpAttachmentFile + '.thumbnail'

    const supportedImageTypes = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif'
    }
    const supportedAudioTypes = {
      'audio/mpeg': 'mp3',
      'audio/x-m4a': 'm4a',
      'audio/mp4': 'm4a',
      'audio/ogg': 'ogg',
      'audio/x-wav': 'wav'
    }

    // Check a mime type
    try {
      let magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE)
      let detectFile = Promise.promisify(magic.detectFile, magic)
      this.mimeType = await detectFile(tmpAttachmentFile)
    } catch(e) {
      if (_.isEmpty(this.mimeType)) {
        throw e
      }
      // otherwise, we'll use the fallback provided by the user
    }

    if (supportedImageTypes[this.mimeType]) {
      // Set media properties for 'image' type
      this.mediaType = 'image'
      this.fileExtension = supportedImageTypes[this.mimeType]

      // Store a thumbnail for a compatible image
      let img = Promise.promisifyAll(gm(tmpAttachmentFile))
      let size = await img.sizeAsync()

      if (size.width > 525 || size.height > 175) {
        // Looks big enough, needs a resize
        this.noThumbnail = '0'

        img = img
          .resize(525, 175)
          .autoOrient()
          .quality(95)

        if (config.thumbnails.storage.type === 's3') {
          await img.writeAsync(tmpThumbnailFile)
          await this.uploadToS3(tmpThumbnailFile, config.thumbnails)
          await fs.unlinkAsync(tmpThumbnailFile)
        } else {
          await img.writeAsync(this.getThumbnailPath())
        }
      } else {
        // Since it's small, just use the original image
        this.noThumbnail = '1'
      }
    } else if (supportedAudioTypes[this.mimeType]) {
      // Set media properties for 'audio' type
      this.mediaType = 'audio'
      this.fileExtension = supportedAudioTypes[this.mimeType]
      this.noThumbnail = '1'

      // Analyze metadata to get Artist & Title
      let readStream = fs.createReadStream(tmpAttachmentFile)
      let asyncMeta = Promise.promisify(meta)
      let metadata = await asyncMeta(readStream)

      this.title = metadata.title

      if (_.isArray(metadata.artist)) {
        this.artist = metadata.artist[0]
      } else {
        this.artist = metadata.artist
      }
    } else {
      // Set media properties for 'general' type
      this.mediaType = 'general'
      this.noThumbnail = '1'
    }

    // Store an original attachment
    if (config.attachments.storage.type === 's3') {
      await this.uploadToS3(tmpAttachmentFile, config.attachments)
      await fs.unlinkAsync(tmpAttachmentFile)
    } else {
      await fs.renameAsync(tmpAttachmentFile, this.getPath())
    }

    return attachment
  }

  // Upload original attachment or its thumbnail to the S3 bucket
  Attachment.prototype.uploadToS3 = async function(sourceFile, subConfig) {
    let s3 = new aws.S3({
      'accessKeyId': subConfig.storage.accessKeyId || null,
      'secretAccessKey': subConfig.storage.secretAccessKey || null
    })
    let putObject = Promise.promisify(s3.putObject, s3)
    await putObject({
      ACL: 'public-read',
      Bucket: subConfig.storage.bucket,
      Key: subConfig.path + this.getFilename(),
      Body: fs.createReadStream(sourceFile),
      ContentType: this.mimeType,
      ContentDisposition: this.getContentDisposition()
    })
  }

  // Get cross-browser Content-Disposition header for attachment
  Attachment.prototype.getContentDisposition = function() {
    // Old browsers (IE8) need ASCII-only fallback filenames
    let fileNameAscii = this.fileName.replace(/[^\x00-\x7F]/g, '_');

    // Modern browsers support UTF-8 filenames
    let fileNameUtf8 = encodeURIComponent(this.fileName)

    // Inline version of 'attfnboth' method (http://greenbytes.de/tech/tc2231/#attfnboth)
    return `inline; filename="${fileNameAscii}"; filename*=utf-8''${fileNameUtf8}`
  }

  return Attachment
}
