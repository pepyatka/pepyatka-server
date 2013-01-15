var winston = require('winston')
  , logger

exports.create = function() {
  if (!logger) {
    logger = new (winston.Logger)({
      transports: [
        new (winston.transports.Console)({
          'timestamp': true,
          'level': conf.loggerLevel
        })
      ]
    });
  }

  return logger
}
