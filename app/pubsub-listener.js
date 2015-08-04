import Promise from 'bluebird'
import { createClient as createRedisClient } from 'redis'
import _ from 'lodash'
import IoServer from 'socket.io'
import redis_adapter from 'socket.io-redis'
import jwt from 'jsonwebtoken'

import models from './models'
import config_loader from '../config/config'

export default class PubsubListener {
  constructor(server, app) {
    this.app = app

    var config = config_loader.load()

    var redisPub = createRedisClient(config.redis.port, config.redis.host, config.redis.options)
      , redisSub = createRedisClient(config.redis.port, config.redis.host, _.extend(config.redis.options, { detect_buffers: true }))

    redisPub.on('error', function(err) { console.log(err) })
    redisSub.on('error', function(err) { console.log(err) })

    this.io = IoServer(server)
    this.io.adapter(redis_adapter({
      pubClient: redisPub,
      subClient: redisSub
    }))

    this.io.sockets.on('error', function(err) { console.log(err) })
    this.io.sockets.on('connection', this.onConnect.bind(this))

    var redisClient = createRedisClient(config.redis.port, config.redis.host, {})
    redisClient.on('error', function(err) { console.log(err) })
    redisClient.subscribe('post:new', 'post:destroy', 'post:update',
      'comment:new', 'comment:destroy', 'comment:update',
      'like:new', 'like:remove', 'post:hide', 'post:unhide')

    redisClient.on('message', this.onRedisMessage.bind(this))
  }

  async onConnect(socket) {
    let authToken = socket.handshake.query.token
    let config = config_loader.load()
    let secret = config.secret
    let logger = this.app.logger

    let jwtAsync = Promise.promisifyAll(jwt)
    let decoded = await jwtAsync.verifyAsync(authToken, secret)
    socket.user = await models.User.findById(decoded.userId)

    socket.on('subscribe', function(data) {
      for (let channel of Object.keys(data)) {
        if (data[channel]) {
          data[channel].forEach(function(id) {
            if (id) {
              logger.info('User has subscribed to ' + id + ' ' + channel)

              socket.join(channel + ':' + id)
            }
          })
        }
      }
    })

    socket.on('unsubscribe', function(data) {
      for (let channel of Object.keys(data)) {
        if (data[channel]) {
          data[channel].forEach(function(id) {
            if (id) {
              logger.info('User has unsubscribed from ' + id + ' ' + channel)

              socket.leave(channel + ':' + id)
            }
          })
        }
      }
    })
  }

  onRedisMessage(channel, msg) {
    const messageRoutes = {
      'post:new':         this.onPostNew,
      'post:update':      this.onPostUpdate,
      'post:destroy':     this.onPostDestroy,
      'post:hide':        this.onPostHide,
      'post:unhide':      this.onPostUnhide,

      'comment:new':      this.onCommentNew,
      'comment:update':   this.onCommentUpdate,
      'comment:destroy':  this.onCommentDestroy,

      'like:new':         this.onLikeNew,
      'like:remove':      this.onLikeRemove
    }

    messageRoutes[channel](
      this.io.sockets,
      JSON.parse(msg)
    ).catch(e => {throw e})
  }

  // Message-handlers follow
  async onPostDestroy(sockets, data) {
    var event = { meta: { postId: data.postId } }

    sockets.in('timeline:' + data.timelineId).emit('post:destroy', event)
    sockets.in('post:' + data.postId).emit('post:destroy', event)
  }

  async onPostNew(sockets, data) {
    var post = await models.Post.findById(data.postId)
    var json = await new models.PostSerializer(post).promiseToJSON()

    var clientIds = Object.keys(sockets.adapter.rooms['timeline:' + data.timelineId])
    await* clientIds.map(async (clientId) => {
      var socket = sockets.connected[clientId]
      var user = socket.user

      var valid = await post.validateCanShow(user.id)

      if (valid)
        socket.emit('post:new', json)
    })
  }

  async onPostUpdate(sockets, data) {
    var post = await models.Post.findById(data.postId)
    var json = await new models.PostSerializer(post).promiseToJSON()

    sockets.in('timeline:' + data.timelineId).emit('post:update', json)
    sockets.in('post:' + data.postId).emit('post:update', json)
  }

  async onCommentNew(sockets, data) {
    var comment = await models.Comment.findById(data.commentId)
    var json = await new models.PubsubCommentSerializer(comment).promiseToJSON()

    if (data.timelineId) {
      sockets.in('timeline:' + data.timelineId).emit('comment:new', json)
    } else {
      sockets.in('post:' + data.postId).emit('comment:new', json)
    }
  }

  async onCommentUpdate(sockets, data) {
    var comment = await models.Comment.findById(data.commentId)
    var json = await new models.PubsubCommentSerializer(comment).promiseToJSON()

    if (data.timelineId) {
      sockets.in('timeline:' + data.timelineId).emit('comment:update', json)
    } else {
      sockets.in('post:' + data.postId).emit('comment:update', json)
    }
  }

  async onCommentDestroy(sockets, data) {
    var event = { postId: data.postId, commentId: data.commentId }

    sockets.in('post:' + data.postId).emit('comment:destroy', event)

    var post = await models.Post.findById(data.postId)
    var timeLineIds = await post.getTimelineIds()

    for (let timelineId of timeLineIds) {
      sockets.in('timeline:' + timelineId).emit('comment:destroy', event)
    }
  }

  async onLikeNew(sockets, data) {
    var user = await models.User.findById(data.userId)
    var event = await new models.LikeSerializer(user).promiseToJSON()
    event.meta = { postId: data.postId }

    if (data.timelineId) {
      sockets.in('timeline:' + data.timelineId).emit('like:new', event)
    } else {
      sockets.in('post:' + data.postId).emit('like:new', event)
    }
  }

  async onLikeRemove(sockets, data) {
    var event = { meta: { userId: data.userId, postId: data.postId } }

    if (data.timelineId)
      sockets.in('timeline:' + data.timelineId).emit('like:remove', event)
    else
      sockets.in('post:' + data.postId).emit('like:remove', event)
  }

  async onPostHide(sockets, data) {
    // NOTE: posts are hidden only on RiverOfNews timeline so this
    // event won't leak any personal information
    var event = { meta: { postId: data.postId } }
    sockets.in('timeline:' + data.timelineId).emit('post:hide', event)
  }

  async onPostUnhide(sockets, data) {
    // NOTE: posts are hidden only on RiverOfNews timeline so this
    // event won't leak any personal information
    var event = { meta: { postId: data.postId } }
    sockets.in('timeline:' + data.timelineId).emit('post:unhide', event)
  }
}
