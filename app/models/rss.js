"use strict";

var async = require('async');
var uuid = require("node-uuid");
var models = require("../models");
var mkKey = require("../support/models").mkKey;
var _ = require("underscore");
var check = require('validator').check;

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

var errors = function(rss) {
  try {
    check(rss.url).isUrl();
    return false;
  } catch (e) {
    return {errors: {rss: e.message}};
  }
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

    updateBaseAttrs: function(attrs, f) {
      var rss = this;
      var baseAttrs = ["createdAt", "updatedAt", "url"];

      baseAttrs.forEach(function(attr) {
        rss[attr] = attrs[attr] ? attrs[attr] : rss[attr];
      });

      rss.saveBaseAttrs(f);
    },

    _saveBaseAttrs: function(f) {
      db.hmset(mkKey([rssK, this.id]), {
        "url": this.url,
        "createdAt": this.createdAt.toString(),
        "updatedAt": this.updatedAt.toString()
      }, f);
    },

    saveBaseAttrs: function(f) {
      var rss = this;

      var callback = function(m) {
        return function(done) {
          rss[m](done);
        };
      };

      var jobs = [callback("_saveBaseAttrs"), callback("addLookupId")];

      async.parallel(jobs, f);
    },

    addLookupId: function(f) {
      db.zadd(rssIds, this.updatedAt, this.id, f);
    },

    addLookupUrl: function(f) {
      db.hset(mkKey([rssK, this.url]), rssIdK, this.id, f);
    },

    create: function(f) {
      var err = errors(this);
      if (err) {
        f(err, null);
        return;
      }

      var rss = this;
      var callback = function(done) {
        return function(err, res) {
          done(err, res);
        };
      };

      rss.createdAt = new Date().getTime();
      rss.updatedAt = new Date().getTime();
      rss.id = uuid.v4();

      var setBaseAttrs = function(done) {
        rss.saveBaseAttrs(callback(done));
      };

      var addUrlLookup = function(done) {
        rss.addLookupUrl(callback(done));
      };

      var setUser = function(done) {
        rss.addUser(rss.userId, callback(done));
      };

      var jobs = [setBaseAttrs, setUser, addUrlLookup];

      async.parallel(jobs, function(err, res) {
        f(err, rss);
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

    delAllGUIDs: function(f) {
      db.del(mkKey([rssK, this.id, guidsK]), f);
    },

    delAllUsers: function(f) {
      db.del(mkKey([rssK, this.id, usersK]), f);
    },

    delSelf: function(f) {
      db.del(mkKey([rssK, this.id]), f);
    },

    delLookupId: function(f) {
      db.zrem(rssIds, this.id, f);
    },

    delLookupUrl: function(f) {
      db.del(mkKey([rssK, this.url]), f);
    },

    destroy: function(f) {
      var rss = this;
      var callback = function(done) {
        return function(err, res) {
          done(err, res);
        };
      };

      var delGUIDs = function(done) {
        rss.delAllGUIDs(callback(done));
      };

      var delUsers = function(done) {
        rss.delAllUsers(callback(done));
      };

      var delSelf = function(done) {
        rss.delSelf(callback(done));
      };

      var delLookupId = function(done) {
        rss.delLookupId(callback(done));
      };

      var delLookupUrl = function(done) {
        rss.delLookupUrl(callback(done));
      };

      var jobs = [delGUIDs, delUsers, delSelf, delLookupId, delLookupUrl];

      async.parallel(jobs, function(err, res) {
        f(err, res);
      });
    },

    removeUser: function(id, f) {
      var key = mkKey([rssK, this.id, usersK]);
      var rss = this;

      db.srem(key, id, function() {
        db.smembers(key, function(err, res) {
          if (err) {
            f(err, res);
          } else if (res.length == 0) {
            rss.destroy(function() {
              f(err, res);
            });
          } else {
            f(err, res);
          }
        });
      });
    }
  };

  RSS.removeUser = function(urls, user, f) {
    async.forEach(urls, function(url, done) {
      models.RSS.findByUrl(url, function(err, rss) {
        if (err) {
          done(err);
        } else {
          rss.removeUser(user.id, function(err, res) {
            done(err);
          });
        }
      });
    }, f);
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
      if (err || !rss) {
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
