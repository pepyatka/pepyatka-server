"use strict";

var mailer = require('../../lib/mailer').init()

exports.addMailer = function(app) {
  var UserMailer = function() {
  }

  UserMailer.resetPassword = function(user, locals) {
    var subject = 'Pepyatka password reset'

    mailer.sendMail(user, subject, locals, './app/scripts/views/mailer/resetPassword.ejs')
  }

  return UserMailer
}
