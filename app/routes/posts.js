var models = require('../models')
  , _ = require('underscore')
  , fs = require('fs')
  , gm = require('gm')
  , uuid = require('node-uuid')
  , path = require('path')

exports.addRoutes = function(app, connections) {
  app.get('/v1/posts/:postId', function(req, res) {
    models.Post.find(req.params.postId, function(post) {
      post.toJSON(function(json) {
        res.jsonp(json);
      })
    })
  })

  app.post('/v1/posts', function(req, res) {
    // creates and saves new post
    newPost = res.locals.currentUser.newPost(req.body)

    newPost.save(function(post) {
      // process files
      // TODO: extract to Post model
      var attachment = req.body.attachment

      if (attachment) {
        var dataIndex = attachment['data'].indexOf('base64') + 7
        var fileData = attachment['data'].slice(dataIndex)
        var decodedFile = new Buffer(fileData, 'base64')
        var filename = attachment['filename']
        var ext = path.extname(filename || '').split('.');
        ext = ext[ext.length - 1];
        delete req.body['attachment']
        
        var thumbnailId = uuid.v4()
        var thumbnailPath = './public/files/' + thumbnailId + '.' + ext
        var thumbnailHttpPath = '/files/' + thumbnailId + '.' + ext

        // TODO: currently it works only with images, must work with any
        // type of uploaded files.
        gm(decodedFile).format(function(err, value) {
          if (err) {
            // TODO: this is a dup
            post.toJSON(function(json) {
              // TODO: redis publish event instead
              _.each(connections, function(socket) {
                socket.emit('newPost', { post: json })
              });
              
              res.jsonp(json)
            })

            //res.jsonp({'error': 'not an image'})
          } else {
            gm(decodedFile, filename)
              .resize('200', '200')
              .write(thumbnailPath, function(err) {
                if (err) {
                  console.log(err);
                  res.jsonp({'error': 'not an image'})
                }
                
                var newThumbnail = new models.Attachment({
                  'ext': ext,
                  'filename': filename,
                  'path': thumbnailHttpPath            
                })
                
                newThumbnail.save(function(thumbnail) {
                  var attachmentId = uuid.v4()
                  var attachmentPath = './public/files/' + attachmentId + '.' + ext
                  var attachmentHttpPath = '/files/' + attachmentId + '.' + ext
                  
                  var newAttachment = post.newAttachment({
                    'ext': ext,
                    'filename': filename,
                    'path': attachmentHttpPath,
                    'thumbnailId': thumbnail.id
                  })

                  newAttachment.save(function(attachment) {
                    gm(decodedFile, filename)
                      .write(attachmentPath, function(err) {
                        if (err) throw err;
                        
                        post.attachments.push(attachment)
                        
                        post.toJSON(function(json) {
                          // TODO: redis publish event instead
                          _.each(connections, function(socket) {
                            socket.emit('newPost', { post: json })
                          });
                          
                          res.jsonp(json)
                        })
                      })
                  })
                })       
              })
          }
        })
      } else {
        // TODO: this is a dup
        post.toJSON(function(json) {
          // TODO: redis publish event instead
          _.each(connections, function(socket) {
            socket.emit('newPost', { post: json })
          });
          
          res.jsonp(json)
        })
      }
    })
  })
}
