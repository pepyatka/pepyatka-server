"use strict";

var request = require('superagent')
    , app = require('../../index')

exports.flushDb = function() {
  return function(done) {
    $database.flushdbAsync()
        .then(function () {
          done()
        })
  }
}

exports.createUser = function(username, password, attributes, callback) {
  return function(done) {
    if (typeof attributes === 'function') {
      callback = attributes
      attributes = {}
    }

    var user = {
      username: username,
      password: password
    }
    if (attributes.email)
      user.email = attributes.email

    request
      .post(app.config.host + '/v1/users')
      .send(user)
      .end(function(err, res) {
        if (callback) {
          var luna = res.body.users
          luna.password = user.password
          callback(res.body.authToken, luna)
        }
        done()
      })
  }
}

exports.createUserCtx = function(context, username, password) {
  return exports.createUser(username, password, function(token) {
    context.authToken = token
    context.username = username
    context.password = password
  })
}

exports.subscribeToCtx = function(context, username) {
  return function(done) {
    request
      .post(app.config.host + '/v1/users/' + username + '/subscribe')
      .send({ authToken: context.authToken })
      .end(function(err, res) {
        done()
      })
  }
}

exports.createPost = function(context, body, callback) {
  return function(done) {
    request
        .post(app.config.host + '/v1/posts')
        .send({ post: { body: body }, authToken: context.authToken })
        .end(function(err, res) {
          context.post = res.body.posts
          if (callback) {
            callback(context.post)
          }
          done()
        })
  };
}

exports.createPostForTest = function(context, body, callback) {
  request
      .post(app.config.host + '/v1/posts')
      .send({ post: { body: body }, authToken: context.authToken })
      .end(function(err, res) {
        context.post = res.body.posts
        callback(err, res)
      })
}

exports.createComment = function(body, postId, authToken, callback) {
  return function(done) {
    var comment = {
      body: body,
      postId: postId
    }

    request
      .post(app.config.host + '/v1/comments')
      .send({ comment: comment, authToken: authToken })
      .end(function(err, res) {
        done(err, res)
      })
  }(callback)
}

exports.removeComment = function(commentId, authToken, callback) {
  return function(done) {

    request
      .post(app.config.host + '/v1/comments/' + commentId)
      .send({
        authToken: authToken,
        '_method': 'delete'
      })
      .end(function(err, res) {
        done(err, res)
      })
  }(callback)
}

exports.getTimeline = function(timelinePath, authToken, callback) {
  return function(done) {
    var sendParams = {};
    if (authToken) {
      sendParams.authToken = authToken
    }
    request
      .get(app.config.host + timelinePath)
      .query(sendParams)
      .end(function(err, res) {
        done(err, res)
      })

  }(callback)
}
