"use strict";

var Promise = require('bluebird')
  , redis = require('redis')
  , config = require('./config').load()

Promise.promisifyAll(redis.RedisClient.prototype)
Promise.promisifyAll(redis.Multi.prototype)

var database = redis.createClient(config.redis.port, config.redis.host, config.redis.options)

// TODO: move to app.logger
database.on('connect'     , log('connect'))
database.on('ready'       , log('ready'))
database.on('reconnecting', log('reconnecting'))
database.on('error'       , logAndQuit('error'))
database.on('end'         , log('end'))

function log(type) {
  return function() {
    console.log(type, arguments)
  }
}

function logAndQuit(type) {
  return function() {
    console.log(type, arguments)
    process.exit(1)
  }
}

exports.selectDatabase = function() {
  return new Promise(function(resolve, reject) {
    database.selectAsync(config.database)
      .then(function(database) { resolve(database) })
  })
}

exports.connect = function() {
  return database
}

exports.redis = function() {
  return redis
}

exports.disconnect = function() {
  redis.end()
  database = null
}
