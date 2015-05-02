"use strict";

var nodemailer = require('nodemailer')
var transport = {
  name: 'minimal',
  version: '0.1.0',
  send: function(mail, callback) {
    var input = mail.message.createReadStream();
    input.pipe(process.stdout);
    input.on('end', function() {
      callback(null, true)
    })
  }
}

exports.getConfig = function() {
  var config = {
    port: 3000,
    database: 2,

    secret: 'secret',

    origin: 'http://localhost:3333',

    appRoot: '.'
  }

  config.attachments = {
    // Make sure that all directories here have a trailing slash
    urlDir: 'http://localhost:3000/attachments/original/',
    fsDir: './public/files/original/',
    fileSizeLimit: '10mb',

    thumbnails: {
      urlDir: 'http://localhost:3000/attachments/thumbnails/',
      fsDir: './public/files/thumbnails/'
    }
  }

  config.profilePictures = {
    urlDir: 'http://localhost:3000/files/profilePictures/',
    fsDir: './public/files/profilePictures/'
  }

  config.mailer = {
    transport: transport,
    fromName: 'Pepyatka',
    fromEmail: 'mail@pepyatka.com',
    resetPasswordMailSubject: 'Pepyatka password reset',
    host: config.origin
  }

  config.redis = {
    host: 'localhost',
    port: 6379
  }

  return config
}
