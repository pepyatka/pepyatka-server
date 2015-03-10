"use strict";

exports.getConfig = function() {
  return {
    port: 3000,
    database: 3,

    saltSecret: 'secret token'
  }
}
