"use strict";

var Promise = require('bluebird')
  , nodemailer = require('nodemailer')
  , config = require('../config/config').load()
  , fs = Promise.promisifyAll(require('fs'))
  , ejs = require('ejs')
  , logger = require('winston')
  , _ = require('lodash')

exports.init = function(app) {
  var Mailer = function() {
  }

  Mailer.formatUsername = function(name, email) {
    return name + ' <' + email + '>'
  }

  Mailer.sendMail = function(recipient, subject, locals, file) {
    fs.readFileAsync(file, 'utf8')
      .then(function (template) {
        locals.config = config
        var html = ejs.render(template, locals)

        var message = {
          to: Mailer.formatUsername(recipient.screenName, recipient.email),
          subject: _.trunc(subject, 50),
          html: html
        }

        var transport = config.mailer.transport
        var transporter = nodemailer.createTransport(transport)

        logger.info('Sending Mail to ' + recipient.email + '...')

        message.from = Mailer.formatUsername(config.mailer.fromName, config.mailer.fromEmail)
        message.headers = {
          'X-Laziness-level': 1000
        }

        transporter.sendMail(message, function(error) {
          if (error) {
            logger.info('Error occured!')
            logger.info(error.message)
            return
          }

          logger.info('Message sent successfully.')

          transporter.close()
        })
      })
  }

  return Mailer
}
