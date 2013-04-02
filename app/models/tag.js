var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')

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
        result[tagName] = object2[tagName] - object1[tagName]
        continue
      }

      result[tagName] = object1[tagName] * -1
    }

    for (var tagName in object2) {
      if (comparisonTags.indexOf(tagName) != -1)
        continue

      result[tagName] = object2[tagName]
    }

    callback(null, result)
  }

  Tag.extract = function(text, callback) {
    var tags = text.match(/#[А-Яа-я\w]+/ig)
    var result = {}
    async.forEach(tags, function(tag, done) {
      tag = tag.toLowerCase()
      if (result[tag]) {
        result[tag]++
        done()
      }

      result[tag] = 1
      done()
    },
    function(err) {
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
      },
      function(err) {
        callback(err)
      })
  }
  
  Tag.prototype = {
  }
  
  return Tag;
}
