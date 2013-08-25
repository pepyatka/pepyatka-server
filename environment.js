var express = require('express')
  , app = express()
  , redis = require('./db')
  , db = redis.connect()

require('./public/js/libs/plugins/core_ext')

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.set('redisdb', 1);
});

app.configure('production', function(){
  app.set('redisdb', 0);
});

app.configure('test', function(){
  app.set('redisdb', 2);
});

var selectDb = function(callback) {
  db.select(app.get('redisdb'), function(err, res) {
    callback(err, res, db)
  })
}

exports.init = function(callback) {
  selectDb(callback)
}
