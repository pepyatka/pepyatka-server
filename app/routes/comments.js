var models = require('../models');

exports.add_routes = function(app) {
  app.post('/comments', function(req, res){
    attrs = req.body
    // TODO -> Post.newComment(new models.Comment(attrs)
    attrs.user_id = req.session.user_id

    comment = new models.Comment(attrs)

    comment.save(function() {
      res.redirect('/')
    })
  });
}
