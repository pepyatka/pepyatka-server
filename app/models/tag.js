var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')

exports.addModel = function(db) {
  var tagRegExp = /#[А-Яа-я\w]+/ig

  function Tag(params) {
    this.name = params.id
  }

  Tag.findAll = function(callback) {
    db.zrevrange('tags:everyone', 0, -1, function(err, tags) {
      callback(err, tags)
    })
  }

  Tag.diff = function(object1, object2, callback) {
    var result = {}
    for (var tagName in object1) {
      if (!object2[tagName]) {
        result[tagName] = object1[tagName] * -1
        continue
      }

      result[tagName] = object2[tagName] - object1[tagName];
      delete object2[tagName]
    }

    for (var tagName2 in object2) {
      result[tagName] = object2[tagName]
    }

    callback(null, result)
  }

  Tag.extract = function(text, callback) {
    var tags = text.match(tagRegExp)
    if (!tags) return callback(null, {})

    async.reduce(tags, {}, function(memo, tag, callback) {
      tag = tag.toLowerCase()
      if(memo[tag]) {
        memo[tag]++
        return callback(null, memo)
      }

      memo[tag] = 1
      callback(null, memo)
    }, function(err, result) {
      callback(err, result)
    })
  }

  Tag.update = function(tagInfoObject, callback) {
    var tags = []
    for (var tag in tagInfoObject) {
      tags.push({ tagName: tag, count: tagInfoObject[tag] })
    }

    async.forEach(tags, function(tag, done) {
      db.zincrby('tags:everyone', tag.count, tag.tagName, function(err, res) {
        done(err)
      })
    }, function(err) {
      callback(err)
    })
  }
  
  Tag.prototype = {
  }
  
  return Tag;
}
