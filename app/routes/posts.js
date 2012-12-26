var models = require('../models');

exports.add_routes = function(app) {
  app.get('/posts', function(req, res){
    res.render('posts');
  });

  app.post('/posts', function(req, res){
    post = new models.Post(req.body)

    res.render('home')
  });
}
