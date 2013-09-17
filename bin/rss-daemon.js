"use strict";

var rss = require("../services/rss");
var env = require("../environment");
var resque = require('coffee-resque').connect({
  host: "127.0.0.1",
  port: "6379"
});

var queue = "fetch-feeds";

env.init(function(_,__,db) {

  setInterval(function() {
    db.llen("resque:queue:" + queue, function(err, len) {
      if (len == 0) {
        db.zrangebyscore(["rss_ids", "-inf", "+inf"], function(err, ids) {
          ids.forEach(function(id) {
            resque.enqueue(queue, "fetch", [id]);
          });
        });
      }
    });
  }, 5000);

  var jobs = {
    fetch: function(id, done) {
      console.log("start job");
      rss.fetchUpdates({id: id}, function() {
        console.log("end job");
        done();
      });
    }
  };

  for (var i = 0; i < process.argv[2]; i++) {
    console.log("Starting worker");
    resque.worker("*", jobs).start();
  }
});
