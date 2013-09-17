var models = require("../models");
var mailerConf = require('./../../conf/envLocal.js').getMailerConfig();
var FeedFactory = models.FeedFactory;

var respondWithRss = function(req, res, select) {
  // FIXME: Can't use named params for some reason, e.g:
  // app.param('range', /^(\w+)\.\.(\w+)?$/); causes an error
  var userName = req.params[0];

  FeedFactory.findByName(userName, function(err, user) {
    if (err || !user) {
      res.status(500).send("Error");
      return;
    }

    user.toRss({
      siteUrl: mailerConf.domain,
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
