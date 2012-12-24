var redis = require('../db')
  , db = redis.connect()

/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index.ejs', { title: 'Express' });
};
