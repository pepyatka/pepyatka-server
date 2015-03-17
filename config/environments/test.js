"use strict";

exports.getConfig = function() {
  return {
    port: 31337,
    database: 3,

    saltSecret: 'secret token',
    secret: 'secret',

    host: "http://localhost:31337",
    origin: 'http://localhost:3333'
  }
}
