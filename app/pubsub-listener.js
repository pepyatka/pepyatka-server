import Promise from 'bluebird'
import { createClient as redis } from 'redis'
import _ from 'lodash'
import IoServer from 'socket.io'
import adapter from 'socket.io-redis'

import models from './models'
import config_loader from '../config/config'

export default class PubsubListener {
  constructor(server, app) {
    "use strict";
    var io = IoServer(server)
    var config = config_loader.load()

    var redisPub = redis(config.redis.port, config.redis.host, config.redis.options)
      , redisSub = redis(config.redis.port, config.redis.host, _.extend(config.redis.options, { detect_buffers: true }))

    redisPub.on('error', function(err) { console.log(err) })
    redisSub.on('error', function(err) { console.log(err) })

    io.adapter(adapter({
      pubClient: redisPub,
      subClient: redisSub
    }))

    io.sockets.on('connection', function(socket) {
      socket.on('subscribe', function(data) {
        for (let channel of Object.keys(data)) {
          if (data[channel]) {
            data[channel].forEach(function(id) {
              if (id) {
                app.logger.info('User has subscribed to ' + id + ' ' + channel)

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
                app.logger.info('User has disconnected from ' + id + ' ' + channel)

                socket.leave(channel + ':' + id)
              }
            })
          }
        }
      })
    })

    var channels = redis(config.redis.port, config.redis.host, {})
    channels.on('error', function(err) { console.log(err) })
    channels.subscribe('post:new', 'post:destroy', 'post:update',
      'comment:new', 'comment:destroy', 'comment:update',
      'like:new', 'like:remove', 'post:hide', 'post:unhide' )

    // TODO: extract to separate functions
    channels.on('message', function(channel, msg) {
      switch(channel) {
        case 'post:destroy':
          var data = JSON.parse(msg)
          var event = { meta: { postId: data.postId } }

          io.sockets.in('timeline:' + data.timelineId).emit('post:destroy', event)
          io.sockets.in('post:' + data.postId).emit('post:destroy', event)

          break

        case 'post:new':
          var data = JSON.parse(msg)

          models.Post.findById(data.postId)
            .then(function(post) {
              new models.PostSerializer(post).toJSON(function(err, json) {
                io.sockets.in('timeline:' + data.timelineId).emit('post:new', json)
              })
            })

          break

        case 'post:update':
          var data = JSON.parse(msg)

          models.Post.findById(data.postId)
            .then(function(post) {
              new models.PostSerializer(post).toJSON(function(err, json) {
                io.sockets.in('timeline:' + data.timelineId).emit('post:update', json)
                io.sockets.in('post:' + data.postId).emit('post:update', json)
              })
            })

          break

        case 'comment:new':
          var data = JSON.parse(msg)

          models.Comment.findById(data.commentId)
            .then(function(comment) {
              new models.PubsubCommentSerializer(comment).toJSON(function(err, json) {
                if (data.timelineId) {
                  io.sockets.in('timeline:' + data.timelineId).emit('comment:new', json)
                } else {
                  io.sockets.in('post:' + data.postId).emit('comment:new', json)
                }
              })
            })

          break

        case 'comment:update':
          var data = JSON.parse(msg)

          models.Comment.findById(data.commentId)
            .then(function(comment) {
              new models.PubsubCommentSerializer(comment).toJSON(function(err, json) {
                if (data.timelineId) {
                  io.sockets.in('timeline:' + data.timelineId).emit('comment:update', json)
                } else {
                  io.sockets.in('post:' + data.postId).emit('comment:update', json)
                }
              })
            })

          break

        case 'comment:destroy':
          var data = JSON.parse(msg)
          var event = { postId: data.postId, commentId: data.commentId }

          io.sockets.in('post:' + data.postId).emit('comment:destroy', event)

          models.Post.findById(data.postId)
            .then(function(post) {
              return post.getTimelineIds()
            })
            .then(function(timelineIds) {
              return Promise.map(timelineIds, function(timelineId) {
                return io.sockets.in('timeline:' + timelineId).emit('comment:destroy', event)
              })
            })

          break

        case 'like:new':
          var data = JSON.parse(msg)

          models.User.findById(data.userId)
            .then(function(user) {
              new models.LikeSerializer(user).toJSON(function(err, json) {
                var event = json
                event.meta = { postId: data.postId }

                if (data.timelineId) {
                  io.sockets.in('timeline:' + data.timelineId).emit('like:new', event)
                } else {
                  io.sockets.in('post:' + data.postId).emit('like:new', event)
                }
              })
            })

          break

        case 'like:remove':
          var data = JSON.parse(msg)
          var event = { meta: { userId: data.userId, postId: data.postId } }

          if (data.timelineId)
            io.sockets.in('timeline:' + data.timelineId).emit('like:remove', event)
          else
            io.sockets.in('post:' + data.postId).emit('like:remove', event)

          break

        case 'post:hide':
          // NOTE: posts are hidden only on RiverOfNews timeline so this
          // event won't leak any personal information
          var data = JSON.parse(msg)
          var event = { meta: { postId: data.postId } }
          io.sockets.in('timeline:' + data.timelineId).emit('post:hide', event)

          break

        case 'post:unhide':
          // NOTE: posts are hidden only on RiverOfNews timeline so this
          // event won't leak any personal information
          var data = JSON.parse(msg)
          var event = { meta: { postId: data.postId } }
          io.sockets.in('timeline:' + data.timelineId).emit('post:unhide', event)

          break
      }
    })
  }
}
