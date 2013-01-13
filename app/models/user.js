var uuid = require('node-uuid')
  , models = require('../models')
  , async = require('async')
  , crypto = require('crypto')

exports.addModel = function(db) {
  function User(params) {
    console.log('new User(' + JSON.stringify(params) + ')')

    this.id = params.id
    this.username = params.username
    this.password = params.password
    this.hashedPassword = params.hashedPassword
    this.salt = params.salt
    this.createdAt = parseInt(params.createdAt)
    this.updatedAt = parseInt(params.updatedAt)
  }

  // TODO: create Anonymous model which is inherited from User
  User.anon = function(callback) {
    console.log('User.anon()')
    // init anonymous user if it doesn't exist yet
    var userId = uuid.v4();

    var returnAnon = function() {
      User.findByUsername('anonymous', function(user) {
        callback(user.id);
      })
    }

    db.setnx('username:anonymous:uid', userId, function(err, res) {
      if (res == 1) {
        db.hsetnx('user:' + userId, 'username', 'anonymous', function(err, res) {
          returnAnon()
        })
      } else {
        returnAnon()
      }
    })
  }

  User.findByUsername = function(username, callback) {
    console.log('User.findByUsername("' + username + '")')
    db.get('username:' + username + ':uid', function (err, userId) {
      User.findById(userId, function(user) {
        // TODO: callback(err, user)
        if (user.id)
          callback(user)
        else
          callback(null)
      })
    })  
  }

  User.findById = function(userId, callback) {
    console.log('User.findById("' + userId + '")')
    db.hgetall('user:' + userId, function(err, attrs) {
      // XXX: Seems it's either deleted user or broken session. Redirect to
      // auth method... some day.
      if (attrs === null) attrs = {}

      attrs.id = userId

      // TODO: callback(err, user)
      callback(new User(attrs))
    })
  },

  User.generateSalt = function(callback) {
    console.log('- User.generateSalt()')
    // Note: this is an async function - quite interesting
    return crypto.randomBytes(16, function(ex, buf) {
      var token = buf.toString('hex');
      callback(token)
    });
  }

  User.hashPassword = function(clearPassword) {
    console.log('- User.hashPassword()')
    // TODO: move this random string to configuration file
    return crypto.createHash("sha1").
      update(conf.saltSecret).
      update(clearPassword).
      digest("hex");
  },

  User.prototype = {
    updateHashedPassword: function(callback) {
      console.log('- user.updateHashedPassword()')
      if (this.password) {
        this.saltPassword(this.password, function() {
          callback()
        })
      }
    },

    saltPassword: function(clearPassword, callback) {
      console.log('- user.saltPassword()')

      var that = this

      User.generateSalt(function(salt) {
        that.salt = salt
        that.hashedPassword = User.hashPassword(salt + User.hashPassword(clearPassword))

        callback()
      })
    },

    validPassword: function(clearPassword) {
      console.log('- user.validPassword()')
      var hashedPassword = User.hashPassword(this.salt + User.hashPassword(clearPassword))
      console.log(this.hashedPassword)
      console.log(hashedPassword)
      return hashedPassword == this.hashedPassword
    },

    save: function(callback) {
      console.log('- user.save()')

      var that = this

      // XXX: I copy these 4 lines from model to model - define proper
      // parent object and inherit all models from it
      if (!this.createdAt)
        this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      if (this.id === undefined) this.id = uuid.v4()

      this.updateHashedPassword(function() {
        async.parallel([
          function(done) {
            db.hmset('user:' + that.id,
                     { 'username': that.username.toString(),
                       'createdAt': that.createdAt.toString(),
                       'updatedAt': that.updatedAt.toString(),
                       'salt': that.salt.toString(),
                       'hashedPassword': that.hashedPassword.toString()
                     }, function(err, res) {
                       done(err, res)
                     })
          },
          function(done) {
            db.set('username:' + that.username + ':uid', that.id, function(err, res) {
              done(err, res)
            })
          }
        ], function(err, res) {
          callback(that)
        })
      })
    },

    posts: function() {
      console.log('- user.posts()')
      Timeline.find(this.id)
    },

    newPost: function(attrs) {
      console.log('- user.newPost()')
      attrs.userId = this.id
      
      return new models.Post(attrs)
    },

    // XXX: do not like the design of this method. I'd say better to
    // put it into Post model
    newComment: function(attrs) {
      console.log('- user.newComment()')
      attrs.userId = this.id

      return new models.Comment(attrs)
    },

    toJSON: function(callback) {
      console.log('- user.toJSON()')
      callback({
        id: this.id,
        username: this.username
      })
    }

  }
  
  return User;
}
