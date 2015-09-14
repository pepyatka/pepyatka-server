"use strict";

import models, {PostSerializer} from '../../../models'
import config_loader from '../../../../config/config'
import url from 'url'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import request from 'request'
import Promise from 'bluebird'

var config = config_loader.load()

exports.addController = function(app) {
  class BookmarkletController {
    static async create(req, res) {
      try {
        var getAttachments = async function(imageUrl) {
          if (!imageUrl) {
            return []
          }

          var p = url.parse(imageUrl)

          var ext = path.extname(p.pathname).split('.')
          ext = ext[ext.length - 1]

          var originalFileName = p.pathname.split('/').pop()

          var fileName = 'pepyatka' + crypto.randomBytes(4).readUInt32LE(0) + 'tmp.' + ext
          var filePath = '/tmp/' + fileName
          var fileType;

          Promise.promisifyAll(request)
          Promise.promisifyAll(fs)

          let attachmentIds = await request.getAsync({ url: imageUrl, encoding: null })
            .spread(function(response, body) {
              fileType = response.headers['content-type']
              return fs.writeFileAsync(filePath, body)
            })
            .then(function() {
              return fs.statAsync(filePath)
            })
            .then(function(stats) {
              let file = {
                name: originalFileName,
                size: stats.size,
                type: fileType,
                path: filePath
              }

              return req.user.newAttachment({ file: file })
                .then(function(newAttachment) {
                  return newAttachment.create()
                })
                .then(function(newAttachment) {
                  return [newAttachment.id]
                })
            })

          return attachmentIds
        }

        if (!req.user) {
          return res.status(401).jsonp({err: 'Not found'})
        }

        // Download image and create attachment
        let attachments = await getAttachments(req.body.image)

        // Create post
        let newPost = await req.user.newPost({
          body: req.body.title,
          attachments: attachments
        })
        let post = await newPost.create()

        // Create comment
        if (req.body.comment) {
          var newComment = await req.user.newComment({
            body: req.body.comment,
            postId: post.id
          })

          let comment = await newComment.create()
        }

        // Send response with the created post
        let json = await new PostSerializer(newPost).promiseToJSON()
        res.jsonp(json)
      } catch(e) {
        console.log(e)
        console.log(e.stack)
      }
    }
  }

  return BookmarkletController
}
