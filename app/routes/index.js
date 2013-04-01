var models = require('../models');

exports.addRoutes = function(app) {
  app.get('/top/:category', function(req, res) {
    res.render('./home')
  });

  app.get('/search/:searchQuery', function(req, res) {
    res.render('./home')
  });

  app.get('/:username', function(req, res) {
    res.render('./home')
  });

  app.get('/users/:username', function(req, res) {
    res.render('./home')
  });

  app.get('/users/:username/subscriptions', function(req, res) {
    res.render('./home')
  });

  app.get('/users/:username/subscribers', function(req, res) {
    res.render('./home')
  });

  app.get('/users/:username/likes', function(req, res) {
    res.render('./home')
  });

  app.get('/users/:username/comments', function(req, res) {
    res.render('./home')
  });

  app.get('/posts/:postId', function(req, res) {
    res.render('./home')
  });

  app.get('/', function(req, res) {
    res.render('./home')
  });

  app.get('/api/v1/version', function(req, res) {
    res.json({status: 'All your base are belong to us!11',
              version: '0.0.6'})
  })
}
