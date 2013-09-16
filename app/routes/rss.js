var models = require("../models");
var FeedFactory = models.FeedFactory;

var respondWithRss = function(req, res, select) {
  // Can't use named params for some reason, e.g:
  // app.param('range', /^(\w+)\.\.(\w+)?$/);
  var userName = req.params[0];

  FeedFactory.findByName(userName, function(err, user) {
    if (err || !user) {
      res.status(500).send("Error");
      return;
    }

    user.toRss({
      siteUrl: req.headers.host, // FIXME: XXX
      select: select
    }, function(err, feed) {
      if (err) {
        res.status(500).send("Error");
      } else {
        res.send(feed.xml());
      }
    });
  });
};

exports.addRoutes = function(app) {
  app.get(/\/users\/(\w+)\/posts.rss$/, function(req, res) {
    respondWithRss(req, res, ["info", "posts"]);
  });

  app.get(/\/users\/(\w+)\/comments.rss$/, function(req, res) {
    respondWithRss(req, res, ["info", "comments"]);
  });

  app.get(/\/users\/(\w+)\/likes.rss$/, function(req, res) {
    respondWithRss(req, res, ["info", "likes"]);
  });
};
