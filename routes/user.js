var redis = require('../db')
  , db = redis.connect()

/*
 * GET users listing.
 */

exports.list = function(req, res){
  res.send("respond with a resource");
};
