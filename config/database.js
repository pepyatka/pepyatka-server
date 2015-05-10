"use strict";

var Promise = require('bluebird')
  , redis = require('redis')
  , config = require('./config').load()
  , _ = require('lodash')

Promise.promisifyAll(redis.RedisClient.prototype)
Promise.promisifyAll(redis.Multi.prototype)

function isUUID(arg) {
  return arg.length == 36 && arg[8] == '-' && arg[13] == '-' && arg[18] == '-' && arg[23] == '-'
}

function getPerformanceStatisticsKey(command, args) {
  if (_.isString(args[0])) {
    var commandArgs = args[0].split(":").map(function(arg) {
      if (isUUID(arg)) {
        return '*'
      }
      return arg
    })
    return command + " " + commandArgs.join(":")
  }
  return command
}

function initDb() {
  var db = redis.createClient(config.redis.port, config.redis.host, {})

  if (config.redis.analyze_performance) {
    var old_send_command = db.send_command
    db.send_command = function(command, args, callback) {
      var stats = db.redis_statistics
      if (stats) {
        var key = getPerformanceStatisticsKey(command, args)
        var oldCount = stats[key] || 0
        stats[key] = oldCount + 1
      }
      old_send_command.apply(db, arguments)
    }

    db.reset_statistics = function() {
      this.redis_statistics = {}
    }

    db.report_statistics = function(url, logger) {
      if (this.redis_statistics && _.keys(this.redis_statistics).length > 0) {
        logger.info("Statistics for " + url + ":")
        var total = 0
        _.forEach(this.redis_statistics, function(v, k) {
          logger.info("  " + k + ": " + v)
          total += v
        })
        logger.info("  -- TOTAL: " + total)
      }
    }
  }
  return db
}

var database = initDb()

exports.selectDatabase = function() {
  return new Promise(function(resolve, reject) {
    database.selectAsync(config.database)
      .then(function(database) { resolve(database) })
  })
}

exports.connect = function() {
  if (!database) database = initDb()
  return database
}

exports.disconnect = function() {
  redis.end()
  database = null
}
