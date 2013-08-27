"use strict";

var request = require("request");
var _ = require("underscore");
var fastFeed = require("fast-feed");
var models = require("../app/models");
var RSS = models.RSS;

var parseUrl = function(url, f) {
  request(url, function(err, resp, feed) {
    try {
      f(false, fastFeed.parse(feed));
    } catch(e) {
      f(true, null);
      console.log("REQUEST ERROR:");
      console.log(err);
      console.log("FASTFEED ERROR:");
      console.log(e);
      console.log("RESPONSE:");
      console.log(resp);
    }
  });
};

var postUpdates = function(rss, updates, formatter, f) {
  rss.getUsers(function(users) {
    users.forEach(function(user) {
      models.User.findById(user, function(err, user) {

        updates.forEach(function(article) {
          user.newPost({
            body: formatter(article.description)
          }, function(err, post) {
            post.create(function() {});
          });
        });

      });
    });
    f();
  });
};

var _fetchUpdates = function(rss, formatter, f) {
  rss.getGUIDs(function(guids) {
    parseUrl(rss.url, function(error, feed) {
      if (error) {
        f();
        return;
      }

      var items = feed.items;
      var feedGUIDs = _.map(items, function(e) {
        return e.id;
      });
      var newGUIDs = _.difference(feedGUIDs, guids);
      var newItems = _.map(newGUIDs, function(guid) {
        return _.find(items, function(e) {
          return e.id == guid;
        });
      });

      console.log("updates:");
      console.log(newGUIDs);

      if (newItems.length == 0) {
        f();
      } else {
        rss.addGUIDs(newGUIDs, function() {
          if (guids.length == 0) {
            f();
            return;
          }
          postUpdates(rss, newItems, formatter, f);
        });
      }
    });
  });
};

var fetchUpdates = function(options, f) {
  var formatter = options.formatter || function(text) {
    return text.replace(/(<([^>]+)>)|(&.+;)/ig, "");
  };

  var callback = function(err, rss) {
    if (!err && rss.url) {
      _fetchUpdates(rss, formatter, f);
    }
  };

  if (options.url) {
    RSS.findByUrl(options.id, callback);
  } else if (options.id) {
    RSS.find(options.id, callback);
  }
};

exports.fetchUpdates = fetchUpdates;