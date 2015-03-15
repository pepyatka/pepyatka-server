"use strict";

exports.getConfig = function() {
  return {
    port: 3000,
    database: 2,

    saltSecret: 'secret token',
    secret: 'secret'
  }
}
