"use strict";

exports.getConfig = function() {
  return {
    port: 3000,
    database: 2,

    secret: 'secret',

    origin: 'http://localhost:3333',

    attachments: {
      // Make sure that all directories here have a trailing slash
      urlDir: 'http://localhost:3000/attachments/original/',
      fsDir: './public/files/original/',

      thumbnails: {
        urlDir: 'http://localhost:3000/attachments/thumbnails/',
        fsDir: './public/files/thumbnails/'
      }
    }
  }
}
