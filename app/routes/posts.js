var models = require('../models')
  , fs = require('fs')
  , gm = require('gm')
  , uuid = require('node-uuid')
  , path = require('path')
  , async = require('async')
  , redis = require('redis')

exports.addRoutes = function(app) {
  app.get('/v1/posts/:postId', function(req, res) {
    models.Post.findById(req.params.postId, function(err, post) {
      if (post) {
        post.toJSON(function(err, json) {
          res.jsonp(json);
        })
      } else {
        res.jsonp({'error': 'Not found'}, 404);
      }
    })
  })

  app.post('/v1/posts/:postId/like', function(req, res) {
    models.Post.addLike(req.params.postId, req.user.id, function(err, r) {
      var pub = redis.createClient();
      pub.publish('newLike',
                  JSON.stringify({ userId: req.user.id,
                                   postId: req.params.postId }))

      // post.toJSON(function(err, json) { res.jsonp(json) })

      res.jsonp({})
    })
  })

  app.post('/v1/posts/:postId/unlike', function(req, res) {
    models.Post.removeLike(req.params.postId, req.user.id, function(err, r) {
      var pub = redis.createClient();
      pub.publish('removeLike',
                  JSON.stringify({ userId: req.user.id,
                                   postId: req.params.postId }))

      res.jsonp({})
    })
  })

  app.post('/v1/posts', function(req, res) {
    // creates and saves new post
    req.user.getPostsTimelineId(function(err, timelineId) {
      req.user.newPost({
        body: req.body.body,
        timelineId: timelineId
      }, function(err, newPost) {
        newPost.save(function(err, post) {
          // process files
          // TODO: extract this stuff to Post model!
          // TODO: search for file uploads lib like CarrierWave that could
          // be easily plugged into existing models (kind of models)
          var attachment = null
          if (req.files) {
            attachment = req.files['file-0']
          }

          if (attachment) {
            var tmpPath = attachment.path
            var filename = attachment.name
            var ext = path.extname(filename || '').split('.');
            ext = ext[ext.length - 1];

            var thumbnailId = uuid.v4()
            var thumbnailPath = __dirname + '/../../public/files/' + thumbnailId + '.' + ext
            var thumbnailHttpPath = '/files/' + thumbnailId + '.' + ext

            // TODO: currently it works only with images, must work with any
            // type of uploaded files.
            gm(tmpPath).format(function(err, value) {
              if (err) {
                var pub = redis.createClient();
                pub.publish('newPost', post.id)

                post.toJSON(function(err, json) { res.jsonp(json) })

                //res.jsonp({'error': 'not an image'})
              } else {
                gm(tmpPath)
                  .resize('200', '200')
                  .write(thumbnailPath, function(err) {
                    if (err) {
                      res.jsonp({'error': 'not an image'})
                      return
                    }

                    var newThumbnail = new models.Attachment({
                      'ext': ext,
                      'filename': filename,
                      'path': thumbnailHttpPath,
                      'fsPath': thumbnailPath
                    })

                    newThumbnail.save(function(err, thumbnail) {
                      var attachmentId = uuid.v4()
                      var attachmentPath = __dirname + '/../../public/files/' + attachmentId + '.' + ext
                      var attachmentHttpPath = '/files/' + attachmentId + '.' + ext

                      var newAttachment = post.newAttachment({
                        'ext': ext,
                        'filename': filename,
                        'path': attachmentHttpPath,
                        'thumbnailId': thumbnail.id,
                        'fsPath': attachmentPath
                      })

                      newAttachment.save(function(err, attachment) {
                        // move tmp file to a storage
                        fs.rename(tmpPath, attachmentPath, function(err) {
                          // TODO: check method
                          post.getAttachments(function(err, attachments) {
                            attachments.push(attachment)

                            // TODO: this is a dup
                            var pub = redis.createClient();
                            pub.publish('newPost', post.id)

                            models.Post.findById(post.id, function(err, post) {
                              post.toJSON(function(err, json) { res.jsonp(json) })
                            })
                          })
                        })
                      })
                    })
                  })
              }
            })
          } else {
            // var pub = redis.createClient();
            // pub.publish('newPost', post.id)

            post.toJSON(function(err, json) { res.jsonp(json) })
          }
        })
      })
    })
  })
}
