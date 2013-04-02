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

  Tag.diff = function(object1, object2, callback) {
    var comparisonTags = []
    var result = {}
    for (var tagName in object1) {
      comparisonTags.push(tagName)
      if (object2[tagName]) {
        result[tagName] = object1[tagName] - object2[tagName]
        continue
      }

      result[tagName] = object1[tagName]
    }

    for (var tagName in object2) {
      if (comparisonTags.indexOf(tagName) != -1)
        continue

      result[tagName] = object2[tagName] * -1
    }

    callback(null, result)
  }
  
  Tag.prototype = {
  }
  
  return Tag;
}
