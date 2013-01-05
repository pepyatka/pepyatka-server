var models = require('../models')
  , _ = require('underscore')
  , fs = require('fs')

exports.add_routes = function(app, connections) {
  app.get('/v1/posts/:postId', function(req, res) {
    models.Post.find(req.params.postId, function(post) {
      post.toJSON(function(json) {
        res.jsonp(json);
      })
    })
  })

  app.post('/v1/posts', function(req, res){
    // process files
    var attachment = req.body.attachment
    var dataIndex = attachment['data'].indexOf('base64') + 7
    var fileData = attachment['data'].slice(dataIndex)
    var decodedFile = new Buffer(fileData, 'base64').toString('binary')
    var filename = attachment['filename']
    delete req.body['attachment']

    fs.writeFile('./public/files/' + filename, decodedFile, function(err) {
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
    })
  });
}
