"use strict";

var env = require("../../environment");
var RSS = require("../../app/models").RSS;
var async = require("async");

env.init(function(_,__,db) {
  db.smembers("rss_ids", function(_, ids) {
    db.del("rss_ids", function() {
      async.forEach(ids, function(id, done) {

        RSS.find(id, function(_, rss) {
          rss.addLookupId(function() {
            done();
          });
        });

      }, function() {
        process.exit(1);
      });
    });
  });
});
