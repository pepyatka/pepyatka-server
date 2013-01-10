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
      var attachment = req.files['file-0']

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
            gm(tmpPath)
              .resize('200', '200')
              .write(thumbnailPath, function(err) {
                if (err) {
                  console.log(err);
                  res.jsonp({'error': 'not an image'})
                  return
                }
                
                var newThumbnail = new models.Attachment({
                  'ext': ext,
                  'filename': filename,
                  'path': thumbnailHttpPath,
                  'fsPath': thumbnailPath
                })
                
                newThumbnail.save(function(thumbnail) {
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

                  newAttachment.save(function(attachment) {
                    // move tmp file to a storage
                    fs.rename(tmpPath, attachmentPath, function(err) {
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
