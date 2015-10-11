"use strict";

import fetch from 'node-fetch'
import request  from 'superagent'
import _  from 'lodash'

import app  from '../../index'


let apiUrl = relativeUrl => `${app.config.host}${relativeUrl}`

exports.flushDb = () => {
  return async () => {
    await $database.flushdbAsync()
  }
}

exports.createUser = function(username, password, attributes, callback) {
  return function(done) {
    if (typeof attributes === 'function') {
      callback = attributes
      attributes = {}
    }

    if (typeof attributes === 'undefined')
      attributes = {}

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

exports.createUserCtx = function(context, username, password, attrs) {
  return exports.createUser(username, password, attrs, function(token, user) {
    context.user      = user
    context.authToken = token
    context.username  = username.toLowerCase()
    context.password  = password
    context.attributes = attrs
  })
}

exports.subscribeToCtx = function(context, username) {
  return function(done) {
    request
      .post(apiUrl(`/v1/users/${username}/subscribe`))
      .send({ authToken: context.authToken })
      .end(function(err, res) {
        done(err, res)
      })
  }
}

exports.updateUserCtx = function(context, attrs) {
  return function(done) {
    request
      .post(app.config.host + '/v1/users/' + context.user.id)
      .send({ authToken: context.authToken,
              user: { email: attrs.email },
              '_method': 'put' })
      .end(function(err, res) {
        done(err, res)
      })
  }
}

exports.sendResetPassword = function(email) {
  return function(done) {
    request
      .post(app.config.host + '/v1/passwords')
      .send({ email: email })
      .end(function(err, res) {
        done(err, res)
      })
  }
}

exports.resetPassword = function(token) {
  return function(done) {
    request
      .post(app.config.host + '/v1/passwords/token')
      .send({ '_method': 'put' })
      .end(function(err, res) {
        done(err, res)
      })
  }
}

exports.createPost = function(context, body, callback) {
  return function(done) {
    request
      .post(app.config.host + '/v1/posts')
      .send({ post: { body: body }, meta: { feeds: context.username }, authToken: context.authToken })
      .end(function(err, res) {
        context.post = res.body.posts
        if (typeof callback !== 'undefined')
          callback(context.post)

        done(err, res)
      })
  }
}

exports.createPostForTest = function(context, body, callback) {
  request
    .post(app.config.host + '/v1/posts')
    .send({ post: { body: body }, meta: { feeds: context.username }, authToken: context.authToken })
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

exports.createCommentCtx = function(context, body) {
  return function(done) {
    var comment = {
      body: body,
      postId: context.post.id
    }

    request
      .post(app.config.host + '/v1/comments')
      .send({ comment: comment, authToken: context.authToken })
      .end(function(err, res) {
        context.comment = res.body.comments
        done(err, res)
      })
  }
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

exports.getTimelinePaged = function(timelinePath, authToken, offset, limit, callback) {
  return function(done) {
    var sendParams = {};
    if (!_.isUndefined(authToken)) {
      sendParams.authToken = authToken
    }
    if (!_.isUndefined(offset)) {
      sendParams.offset = offset
    }
    if (!_.isUndefined(limit)) {
      sendParams.limit = limit
    }
    request
      .get(app.config.host + timelinePath)
      .query(sendParams)
      .end(function(err, res) {
        done(err, res)
      })

  }(callback)
}

exports.getSubscribers = function(username, authToken, callback) {
  return function(done) {
    let sendParams = {};
    if (authToken) {
      sendParams.authToken = authToken
    }

    let url = apiUrl(`/v1/users/${username}/subscribers`)

    request
      .get(url)
      .query(sendParams)
      .end(function(err, res) {
        done(err, res)
      })

  }(callback)
}

exports.getSubscriptions = function(username, authToken, callback) {
  return function(done) {
    let sendParams = {};
    if (authToken) {
      sendParams.authToken = authToken
    }

    let url = apiUrl(`/v1/users/${username}/subscriptions`)

    request
      .get(url)
      .query(sendParams)
      .end(function(err, res) {
        done(err, res)
      })

  }(callback)
}

function postJson(relativeUrl, data) {
  return fetch(
    apiUrl(relativeUrl),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  )
}

exports.like = (postId, authToken) => {
  return postJson(`/v1/posts/${postId}/like`, { authToken })
}

exports.goPrivate = (userContext) => {
  return postJson(
    `/v1/users/${userContext.user.id}`,
    {
      authToken: userContext.authToken,
      user: { isPrivate: "1" },
      '_method': 'put'
    }
  )
}

exports.goPublic = (userContext) => {
  return postJson(
    `/v1/users/${userContext.user.id}`,
    {
      authToken: userContext.authToken,
      user: { isPrivate: "0" },
      '_method': 'put'
    }
  )
}

exports.mutualSubscriptions = async (userContexts) => {
  let promises = []

  for (let ctx1 of userContexts) {
    for (let ctx2 of userContexts) {
      if (ctx1.username == ctx2.username) {
        continue
      }

      promises.push(postJson(`/v1/users/${ctx2.username}/subscribe`, {authToken: ctx1.authToken}))
    }
  }

  await* promises
}

exports.createAndReturnPost = async (userContext, body) => {
  let response = await postJson(
    '/v1/posts',
    {
      post: {body},
      meta: {feeds: userContext.username},
      authToken: userContext.authToken
    }
  )

  let data = await response.json()

  return data.posts
}

exports.createCommentAsync = (userContext, postId, body) => {
  return postJson('/v1/comments', {comment: {body, postId}, authToken: userContext.authToken})
}

let getTimeline = async (relativeUrl, userContext) => {
  let url = apiUrl(relativeUrl)

  if (!_.isUndefined(userContext)) {
    let encodedToken = encodeURIComponent(userContext.authToken)
    url = `${url}?authToken=${encodedToken}`
  }

  let response = await fetch(url)
  let data = await response.json()

  return data
}

exports.getRiverOfNews = (userContext) => {
  return getTimeline('/v1/timelines/home', userContext)
}

exports.getMyDiscussions = (userContext) => {
  return getTimeline('/v1/timelines/filter/discussions', userContext)
}
