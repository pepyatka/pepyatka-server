"use strict";

var env = require("../../environment")
  , User = require("../../app/models").User;


env.init(function(_,__,db) {
  User.findAnon(function(err, anon) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      db.hmset("user:" + anon.id + ":info", {
        'screenName': "anonymous",
        'email': "",
        'receiveEmails': "false"
      });
      process.exit(0);
    }
  });
});
