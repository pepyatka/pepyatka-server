"use strict";

var nodemailer = require('nodemailer')
var smtpTransport = require('nodemailer-smtp-transport');

exports.getConfig = function() {
  var config = {
    port: 3000,
    database: 2,

    secret: 'secret',

    origin: 'http://localhost:3333'
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
    transport: smtpTransport,
    fromName: 'Pepyatka',
    fromEmail: 'mail@pepyatka.com',
    host: config.origin
  }

  config.redis = {
    host: 'localhost',
    port: 6379
  }

  return config
}
