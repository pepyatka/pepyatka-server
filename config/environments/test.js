"use strict";

exports.getConfig = function() {
  var config = {
    port: 31337,
    database: 3,

    saltSecret: 'secret token',
    secret: 'secret',

    origin: 'http://localhost:3333'
  }

  config.host = 'http://localhost:' + config.port

  config.attachments = {
    // Make sure that all directories here have a trailing slash
    urlDir: config.host + '/attachments/original/',
    fsDir: '/tmp/pepyatka-attachments/original/',

    thumbnails: {
      urlDir: config.host + '/attachments/thumbnails/',
      fsDir: '/tmp/pepyatka-attachments/thumbnails/'
    }
  }

  return config
}
