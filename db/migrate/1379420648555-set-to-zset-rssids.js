"use strict";

var env = require("../../environment");
var RSS = require("../../app/models").RSS;
var async = require("async");

env.init(function(_,__,db) {
  db.smembers("rss_ids", function(_, ids) {
    db.del("rss_ids", function() {
      var done = function() {
        console.log("Updated all rss.")
        process.exit(1);
      }

      if (ids.length === 0)
        return done()

      async.forEach(ids, function(id, done) {

        RSS.find(id, function(_, rss) {
          console.log("Updating " + id + ".")
          rss.addLookupId(function() {
            done();
          });
        });
      }, function() {
        done()
      });
    });
  });
});
