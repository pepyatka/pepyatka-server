import Promise from 'bluebird'
import jwt from 'jsonwebtoken'
import express from 'express'

import config_loader from '../config/config'
import {User} from './models'

import SessionRoute from './routes/api/v1/SessionRoute'
import BookmarkletRoute from './routes/api/v1/BookmarkletRoute'
import UsersRoute from './routes/api/v1/UsersRoute'
import TimelinesRoute from './routes/api/v1/TimelinesRoute'
import PostsRoute from './routes/api/v1/PostsRoute'
import AttachmentsRoute from './routes/api/v1/AttachmentsRoute'
import CommentsRoute from './routes/api/v1/CommentsRoute'
import GroupsRoute from './routes/api/v1/GroupsRoute'
import PasswordsRoute from './routes/api/v1/PasswordsRoute'


let config = config_loader.load()
Promise.promisifyAll(jwt)


var findUser = async (req, res, next) => {
  var authToken = req.headers['x-authentication-token']
    || req.body.authToken
    || req.query.authToken

  if (authToken) {
    try {
      let decoded = await jwt.verifyAsync(authToken, config.secret)
      let user = await User.findById(decoded.userId)

      if (user) {
        req.user = user
      }
    } catch(e) {
      // invalid token. the user will be treated as anonymous
      console.info(e)
    }
  }

  next()
}

export default function(app) {
  app.use(express.static(__dirname + '/../public'))

  // unauthenticated routes
  app.options('/*', (req, res) => {
    res.status(200).send({})
  })
  SessionRoute.addRoutes(app)
  PasswordsRoute.addRoutes(app)

  // [at least optionally] authenticated routes
  app.all('/*', findUser)
  BookmarkletRoute.addRoutes(app)
  UsersRoute.addRoutes(app)
  GroupsRoute.addRoutes(app)
  TimelinesRoute.addRoutes(app)
  PostsRoute.addRoutes(app)
  AttachmentsRoute.addRoutes(app)
  CommentsRoute.addRoutes(app)
}
