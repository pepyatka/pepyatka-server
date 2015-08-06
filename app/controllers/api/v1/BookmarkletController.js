"use strict";

import models, {PostSerializer} from '../../../models'
import config_loader from '../../../../config/config'
import url from 'url'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import http from 'http'

var config = config_loader.load()

exports.addController = function(app) {
  class BookmarkletController {
    static async create(req, res) {
     try {
      var downloadFile = async function(imageUrl) {
        var p = url.parse(imageUrl)
        var options = {
          host: p.host,
          path: p.pathname
        }

        var ext = path.extname(p.pathname).split('.')
        ext = ext[ext.length - 1]

        var filename = 'pepyatka' + crypto.randomBytes(4).readUInt32LE(0) + 'tmp.' + ext
        var filepath = '/tmp/' + filename
        var file = fs.createWriteStream(filepath)
        var image = ""
        var files = []

        http.get(options, function(response) {
          var request = this
          var contentLength = response.headers['content-length']
          var maxLength = 100000

          if (contentLength > maxLength) {
            file.end()
            request.abort()
            return null
          }

          response.on('data', function (chunk) {
            file.write(chunk)
            image += chunk

            if (image.length > maxLength) {
              file.end()
              request.abort()
              return null
            }
          })

          response.on('end', function() {
            // req.user.newAttachment({ file: file })
            //   .then(function(newAttachment) {
            //     return newAttachment.create()
            //   })
            //   .then(function(newAttachment) {
            //     new AttachmentSerializer(newAttachment).toJSON(function(err, json) {
            //       res.jsonp(json)
            //     })
            //   })

            // files['file-0'] = {
            //   path: filepath,
            //   name: path.basename(filename)
            // }

            file.end()

            return []
          })
        }).on('error', function(err) {
          file.end()
          return null
        }).end()
      }

      if (!req.user)
        return res.status(401).jsonp({ err: 'Not found' })

      // let files = await downloadFile(req.body.image)
      let newPost = await req.user.newPost({
        body: req.body.title
        // attachments: files
      })

      let post = await newPost.create()

      if (req.body.comment) {
        var newComment = await req.user.newComment({
          body: req.body.comment,
          postId: post.id
        })

        let comment = await newComment.create()

        res.jsonp({})
      } else {
        res.jsonp({})
      }
     } catch(e) {
       console.log(e)
       console.log(e.stack)
     }
    }
  }

  return BookmarkletController
}
