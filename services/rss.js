"use strict";

var request = require("request");
var _ = require("underscore");
var fastFeed = require("fast-feed");
var models = require("../app/models");
var RSS = models.RSS;
var Group = models.Group;
var FeedFactory = models.FeedFactory;

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

var postUpdates = function(rss, updates, poster, formatter, f) {
  console.log("postUpdates");
  rss.getUsers(function(users) {
    users.forEach(function(userId) {
      FeedFactory.findById(userId, function(err, user) {

        updates.forEach(function(article) {
          poster(user, rss, article, formatter);
        });

      });
    });
    f();
  });
};

var _fetchUpdates = function(rss, poster, formatter, f) {
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
          postUpdates(rss, newItems, poster, formatter, f);
        });
      }
    });
  });
};

var doTo = function(obj, fns) {
  return _.reduce(fns, function(acc, f) {
    return f(acc);
  }, obj);
};

var defaultFormatter = function(article) {
  var removeHTML = function(article) {
    article.description = article.description.replace(/(<([^>]+)>)|(&.+;)/ig, "");
    return article;
  };

  var addURL = function(article) {
    article.description = article.description + " - " + article.link;

    return article;
  };

  return doTo(article, [removeHTML, addURL]).description;
};

var defaultPoster = function(user, rss, article, formatter) {
  var params = {
    body: formatter(article),
    source: {
      type: "rss",
      id: rss.id
    }
  };

  var callback = function(err, post) {
    post.create(function() {});
  };

  user.newPost(params, callback);
};

var fetchUpdates = function(options, f) {
  var formatter = options.formatter || defaultFormatter;
  var poster = options.poster || defaultPoster;

  var callback = function(err, rss) {
    if (!err && rss.url) {
      _fetchUpdates(rss, poster, formatter, f);
    } else {
      f();
    }
  };

  if (options.url) {
    RSS.findByUrl(options.id, callback);
  } else if (options.id) {
    RSS.find(options.id, callback);
  }
};

exports.fetchUpdates = fetchUpdates;
