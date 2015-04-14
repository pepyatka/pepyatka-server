"use strict";

var Promise = require('bluebird')
  , redis = require('redis')
  , config = require('./config').load()

Promise.promisifyAll(redis.RedisClient.prototype)
Promise.promisifyAll(redis.Multi.prototype)

var database = redis.createClient(config.redis.port, config.redis.host, {})

exports.selectDatabase = function() {
  return new Promise(function(resolve, reject) {
    database.selectAsync(config.database)
      .then(function(database) { resolve(database) })
  })
}

exports.connect = function() {
  if (!database) database = redis.createClient(config.redis.port, config.redis.host, {})
  return database
}

exports.disconnect = function() {
  redis.end()
  database = null
}
