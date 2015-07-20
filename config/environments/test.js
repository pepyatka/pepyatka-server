"use strict";

var stubTransport = require('nodemailer-stub-transport')

exports.getConfig = function() {
  var config = {
    port: 31337,
    database: 3,

    secret: 'secret',
    origin: 'http://localhost:3333',
    appRoot: '.',
    acceptHashedPasswordsOnly: false,

    logLevel: 'warn'
  }

  config.host = 'http://localhost:' + config.port

  config.application = {
    USERNAME_STOP_LIST: ['anonymous', 'public', 'about', 'signin', 'logout',
                         'signup', 'filter', 'settings', 'account', 'groups',
                         'friends', 'list', 'search', 'summary', 'share','404',
                         'iphone', 'attachments', 'files', 'profilepics']
  }

  config.media = {
    url: config.host + '/', // must have trailing slash
    storage: {
      type: 'fs',
      rootDir: '/tmp/pepyatka-media/' // must have trailing slash
    }
  }
  config.attachments = {
    url: config.media.url,
    storage: config.media.storage,
    path: 'attachments/', // must have trailing slash
    fileSizeLimit: '10mb'
  }
  config.thumbnails = {
    url: config.media.url,
    storage: config.media.storage,
    path: 'attachments/thumbnails/' // must have trailing slash
  }
  config.profilePictures = {
    url: config.media.url,
    storage: config.media.storage,
    path: 'profilepics/' // must have trailing slash
  }

  config.mailer = {
    transport: stubTransport,
    options: {}
  }

  config.redis = {
    host: 'localhost',
    port: 6379,
    options: {}
  }

  return config
}
