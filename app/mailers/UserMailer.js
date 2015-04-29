"use strict";

var mailer = require('../../lib/mailer').init()
var config = require('../../config/config').load()

exports.addMailer = function(app) {
  var UserMailer = function() {
  }

  UserMailer.resetPassword = function(user, locals) {
    var subject = config.mailer.resetPasswordMailSubject

    mailer.sendMail(user, subject, locals, config.appRoot + '/app/scripts/views/mailer/resetPassword.ejs')
  }

  return UserMailer
}
