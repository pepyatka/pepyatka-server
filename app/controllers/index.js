var redis = require('../../db')
  , db = redis.connect()

exports.add_routes = function(app) {
  app.get('/', function(req, res){
    res.render('index.ejs', { title: 'Express' });
  });
}
