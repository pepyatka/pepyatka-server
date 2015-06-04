"use strict";

var stubTransport = require('nodemailer-stub-transport')

exports.getConfig = function() {
  var config = {
    port: 31337,
    database: 3,

    secret: 'secret',
    origin: 'http://localhost:3333',
    appRoot: '.',
    acceptHashedPasswordsOnly: false
  }

  config.host = 'http://localhost:' + config.port

  config.application = {
    USERNAME_STOP_LIST: ['anonymous', 'public', 'about', 'signin', 'logout',
                         'signup', 'filter', 'settings', 'account', 'groups',
                         'friends', 'list', 'search', 'summary', 'share','404',
                         'iphone']
  }

  config.attachments = {
    // Make sure that all directories here have a trailing slash
    urlDir: config.host + '/attachments/original/',
    fsDir: '/tmp/pepyatka-attachments/original/',

    thumbnails: {
      urlDir: config.host + '/attachments/thumbnails/',
      fsDir: '/tmp/pepyatka-attachments/thumbnails/'
    }
  }

  config.profilePictures = {
    urlDir: config.host + '/profile-pictures/',
    fsDir: '/tmp/pepyatka-profile-pictures/'
  }

  config.mailer = {
    transport: stubTransport,
    options: {}
  }

  config.redis = {
    host: 'localhost',
    port: 6379
  }

  return config
}
