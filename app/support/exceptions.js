"use strict";

exports.reportError = function(res) {
  return function(err) {
    var status = err.status || 422
    var result = {}
    if ('message' in err) {
      result.err = err.message
    }
    res.status(status).jsonp(result)
  }
}

/**
 * @constructor
 */
exports.BadRequestException = function(message) {
  this.message = message || "Bad Request"
  this.status = 400
}

/**
 * @constructor
 */
exports.ForbiddenException = function(message) {
  this.message = message || "Forbidden"
  this.status = 403
}

/**
 * @constructor
 */
exports.NotFoundException = function(message) {
  this.message = message || "Not found"
  this.status = 404
}
