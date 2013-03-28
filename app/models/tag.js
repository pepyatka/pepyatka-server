var uuid = require('node-uuid')
  , models = require('../models')

exports.addModel = function(db) {
  function Tag(params) {
    this.name = params.id
  }

  Tag.findAll = function(callback) {
    db.zrevrange('tags:everyone', 0, -1, function(err, tags) {
      callback(err, tags)
    })
  }
  
  Tag.prototype = {
  }
  
  return Tag;
}
