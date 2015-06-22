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
    appRoot: '.',
    acceptHashedPasswordsOnly: false,

    logLevel: 'warn'
  }

  config.application = {
    // Pepyatka won't allow users to use the following usernames, they
    // are reserved for internal pages.
    //
    // To load this list from <PEPYATKA_HOME>/banlist.txt (one
    // username per line) file use the following snippet:
    //
    // var fs = require('fs')
    // var array = fs.readFileSync('banlist.txt').toString()
    //               .split("\n").filter(function(n) { return n != '' })
    // config.application {
    //   USERNAME_STOP_LIST = array
    // }
    USERNAME_STOP_LIST: ['anonymous', 'public', 'about', 'signin', 'logout',
                         'signup', 'filter', 'settings', 'account', 'groups',
                         'friends', 'list', 'search', 'summary', 'share','404',
                         'iphone']
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
    host: config.origin,
    options: {}
  }

  config.redis = {
    host: 'localhost',
    port: 6379,
    options: {
      retry_max_delay: 2000, //ms
      connect_timeout: 5000, //ms
      max_attempts: 2, //times
    }
  }

  return config
}
