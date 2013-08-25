"use strict";

var async = require('async');
var uuid = require("node-uuid");
var models = require("../models");
var mkKey = require("../support/models").mkKey;
var _ = require("underscore");

var rssK = "rss";
var rssIdK = "id";
var rssUsersK = "users";
var guidsK = "guids";
var rssIds = "rss_ids";
var urlK = "url";
var usersK = "users";

var normalizeUrl = function(url) {
  return _.without(url, " ").join("");
};

exports.addModel = function(db) {
  var RSS = function(params) {
    this.id = params.id;
    this.url = normalizeUrl(params.url);
    this.userId = params.userId;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  };

  RSS.prototype = {
    addUser: function(user, f) {
      db.sadd(mkKey([rssK, this.id, rssUsersK]), user, f);
    },

    create: function(f) {
      var that = this;
      that.createdAt = new Date().getTime();
      that.updatedAt = new Date().getTime();
      that.id = uuid.v4();

      var setBaseAttrs = function(done) {
        db.hmset(mkKey([rssK, that.id]), {
          "url": that.url,
          "createdAt": that.createdAt.toString(),
          "updatedAt": that.updatedAt.toString()
        }, function(err, res) {
          done(err, res);
        });
      };

      var addToRssIds = function(done) {
        db.sadd(rssIds, that.id, function(err, res) {
          done(err, res);
        });
      };

      var addUrlLookup = function(done) {
        db.hset(mkKey([rssK, that.url]), rssIdK, that.id, function(err, res) {
          done(err, res);
        });
      };

      var setUser = function(done) {
        that.addUser(that.userId, function(err, res) {
          done(err, res);
        });
      };

      var jobs = [setBaseAttrs, setUser, addToRssIds, addUrlLookup];

      async.parallel(jobs, function(err, res) {
        f(err, that);
      });
    },

    getGUIDs: function(f) {
      db.smembers(mkKey([rssK, this.id, guidsK]), function(err, guids) {
        f(guids);
      });
    },

    addGUIDs: function(guids, f) {
      db.sadd(mkKey([rssK, this.id, guidsK]), guids, function(err, res) {
        f();
      });
    },

    getUsers: function(f) {
      db.smembers(mkKey([rssK, this.id, usersK]), function(err, users) {
        f(users);
      });
    },

    removeUser: function(id, f) {
      db.srem(mkKey([rssK, this.id, usersK]), id, f);
    }
  };

  RSS.findByUrl = function(url, f) {
    db.hget(mkKey([rssK, normalizeUrl(url)]), rssIdK, function(err, id) {
      if (!err && id) {
        RSS.find(id, f);
      } else {
        f(true, null);
      }
    });
  };

  RSS.find = function(id, f) {
    db.hgetall(mkKey([rssK, id]), function(err, rss) {
      if (err && !rss) {
        f(true, null);
      } else {
        rss.id = id;
        f(false, new RSS(rss));
      }
    });
  };

  RSS.addUserOrCreate = function(params, f) {
    RSS.findByUrl(params.url, function(err, rss) {
      if (rss) {
        rss.addUser(params.userId, function(err,_) {
          f(err, rss);
        });
      } else {
        new RSS(params).create(function(err, rss) {
          f(err, rss);
        });
      }
    });
  };

  return RSS;
};
