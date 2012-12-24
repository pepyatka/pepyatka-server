var redis = require('../db')
  , db = redis.connect()

/*
 * Session
 */

exports.get = function(req, res){
  res.render('session');
};

exports.post = function(req, res){
  req.session.user_id = db.get('username:anonymous:uid');
  res.redirect("/")
};

exports.logout = function(req, res){
  req.session.destroy();
  res.redirect("/")
};
