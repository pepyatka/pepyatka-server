var http = require('http')
  , fs = require('fs')
  , crypto = require('crypto')
  , path = require('path')
  , url = require('url')

exports.addRoutes = function(app) {
  app.get('/bookmarklet', function(req, res) {
    res.render('./bookmarklet', {csrf_token: req.session._csrf})
  })

  app.post('/bookmarklet', function(req, res) {
    var downloadFile = function(imageUrl, callback) {
      var p = url.parse(imageUrl)
      var options = {
        host: p.host,
        path: p.pathname
      }

      var ext = path.extname(p.pathname).split('.');
      ext = ext[ext.length - 1];

      var filename = 'pepyatka' + crypto.randomBytes(4).readUInt32LE(0) + 'tmp.' + ext;
      var filepath = '/tmp/' + filename
      var file = fs.createWriteStream(filepath);
      var image = "";
      var files = [];

      http.get(options, function(response) {
        var request = this;
        var contentLength = response.headers['content-length'];
        var maxLength = 100000

        if (contentLength > maxLength) {
          file.end()
          request.abort();
          return callback(files)
        }

        response.on('data', function (chunk) {
          file.write(chunk)
          image += chunk;

          if (image.length > maxLength) {
            file.end()
            request.abort();
            return callback(files)
          }
        });

        response.on('end', function() {
          files['file-0'] = {
            path: filepath,
            name: path.basename(filename)
          }

          file.end();
          return callback(files)
        })
      }).on('error', function(err) {
        file.end()
        return callback(files)
      }).end();
    }

    if (!req.user) return res.jsonp({});

    downloadFile(req.body.image, function(files) {
      req.user.newPost({
        body: req.body.title,
        files: files
      }, function(err, newPost) {
        newPost.create(function(err, post) {
          if (err) return res.jsonp({}, 422);

          var conf = require('./../../conf/envLocal.js').getMailerConfig();
          res.conf = conf

          if (req.body.comment) {
            var newComment = req.user.newComment({
              body: req.body.comment,
              postId: post.id
            })

            newComment.create(function(err, comment) {
              if (err) return res.jsonp({}, 422)

              res.render('./bookmarklet/done', {post: post});
            })
          } else {
            res.render('./bookmarklet/done')
          }
        })
      })
    })
  })
}
