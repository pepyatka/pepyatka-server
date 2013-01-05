var models = require('../models')
  , _ = require('underscore')
  , fs = require('fs')
  , gm = require('gm')
  , uuid = require('node-uuid')
  , path = require('path')

exports.add_routes = function(app, connections) {
  app.get('/v1/posts/:postId', function(req, res) {
    models.Post.find(req.params.postId, function(post) {
      post.toJSON(function(json) {
        res.jsonp(json);
      })
    })
  })

  app.post('/v1/posts', function(req, res){
    var savePost = function() {
      // create and save new post
      newPost = res.locals.current_user.newPost(req.body)

      newPost.save(function(post) {
        // Routes should know close to nothing about sockets. Only
        // models can emit a message.
        post.toJSON(function(json) {
          _.each(connections, function(socket) {
            socket.emit('newPost', { post: json })
          });
          
          res.jsonp(json)
        })
      })
    }

    // process files - extracte to Post model
    var attachment = req.body.attachment

    if (attachment) {
      var dataIndex = attachment['data'].indexOf('base64') + 7
      var fileData = attachment['data'].slice(dataIndex)
      var decodedFile = new Buffer(fileData, 'base64')
      var filename = attachment['filename']
      var fileId = uuid.v4()

      req.body['imageId'] = fileId
      
      var ext = path.extname(filename||'').split('.');
      ext = ext[ext.length - 1];

      delete req.body['attachment']

      gm(decodedFile, filename)
        .resize('200', '200')
        .write('./public/files/' + fileId + '.' + ext, function(err) {
          if (err) {
            res.jsonp({'error': 'not an image'})
            return console.log(err);
          }

          savePost()
        })
    } else {
      // post without attachment
      savePost()
    }
  ;
          
})}
