var models = require('../models');

exports.add_routes = function(app) {
  app.get('/posts', function(req, res){
    res.render('posts');
  });

  app.post('/posts', function(req, res){
    attrs = req.body
    attrs.user_id = req.session.user_id

    post = new models.Post(attrs)

    post.save(function() {
      res.redirect('/')
    })
  });
}
