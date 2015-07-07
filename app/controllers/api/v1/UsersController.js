"use strict";

import models, {UserSerializer, MyProfileSerializer, SubscriberSerializer, SubscriptionSerializer} from '../../../models'
import jwt from 'jsonwebtoken'
import _ from 'lodash'
import exceptions from '../../../support/exceptions'
import formidable from 'formidable'
import config_loader from '../../../../config/config'

var config = config_loader.load()

exports.addController = function(app) {
  class UsersController {
    static async create(req, res) {
      var params = {
        username: req.body.username,
        email: req.body.email
      }

      params.hashedPassword = req.body.password_hash
      if (!config.acceptHashedPasswordsOnly) {
        params.password = req.body.password
      }

      try {
        var user = new models.User(params)
        await user.create()

        var secret = config.secret
        var authToken = jwt.sign({ userId: user.id }, secret)

        var json = await new MyProfileSerializer(user).promiseToJSON()
        res.jsonp(_.extend(json, { authToken: authToken }))
      } catch(e) {
        exceptions.reportError(res)(e)
      }
    }

    static async whoami(req, res) {
      if (!req.user)
        return res.status(401).jsonp({ err: 'Not found' })

      var json = await new MyProfileSerializer(req.user).promiseToJSON()
      res.jsonp(json)
    }

    static async show(req, res) {
      var feed = await models.FeedFactory.findByUsername(req.params.username)
      var json = await new UserSerializer(feed).promiseToJSON()
      res.jsonp(json)
    }

    static async subscribers(req, res) {
      var username = req.params.username
        , user

      try {
        user = await models.User.findByUsername(username)
      } catch (e) {
        return res.status(404).send({})
      }

      try {
        var timeline = await user.getPostsTimeline()
        var subscribers = await timeline.getSubscribers()
        var jsonPromises = subscribers.map((subscriber) => new SubscriberSerializer(subscriber).promiseToJSON())

        var json = _.reduce(jsonPromises, async function (memoPromise, jsonPromise) {
          var obj = await jsonPromise
          var memo = await memoPromise

          memo.subscribers.push(obj.subscribers)

          return memo
        }, { subscribers: [] })

        res.jsonp(await json)
      } catch (e) {
        res.status(422).send({})
      }
    }

    static async subscriptions(req, res) {
      var username = req.params.username
        , user

      try {
        user = await models.User.findByUsername(username)
      } catch (e) {
        return res.status(404).send({})
      }

      try {
        var subscriptions = await user.getSubscriptions()
        var jsonPromises = subscriptions.map((subscription) => new SubscriptionSerializer(subscription).promiseToJSON())

        var reducedJsonPromise = _.reduce(jsonPromises, async function(memoPromise, jsonPromise) {
          var obj = await jsonPromise
          var memo = await memoPromise

          var user = obj.subscribers[0]

          memo.subscriptions.push(obj.subscriptions)
          memo.subscribers[user.id] = user

          return memo
        }, { subscriptions: [], subscribers: {} })

        var json = await reducedJsonPromise
        json.subscribers = _.values(json.subscribers)

        res.jsonp(json)
      } catch (e) {
        res.status(422).send({message: e.toString()})
      }
    }

    static async ban(req, res) {
      if (!req.user)
        return res.status(401).jsonp({ err: 'Not found' })

      try {
        var status = await req.user.ban(req.params.username)
        return res.jsonp({ status: status })
      } catch(e) {
        exceptions.reportError(res)(e)
      }
    }

    static async unban(req, res) {
      if (!req.user)
        return res.status(401).jsonp({ err: 'Not found' })

      try {
        var status = await req.user.unban(req.params.username)
        return res.jsonp({ status: status })
      } catch(e) {
        exceptions.reportError(res)(e)
      }
    }

    static async subscribe(req, res) {
      if (!req.user)
        return res.status(401).jsonp({ err: 'Not found' })

      try {
        var user = await models.User.findByUsername(req.params.username)
        var timelineId = await user.getPostsTimelineId()
        await req.user.validateCanSubscribe(timelineId)
        await req.user.subscribeTo(timelineId)

        var json = await new MyProfileSerializer(req.user).promiseToJSON()
        res.jsonp(json)
      } catch(e) {
        exceptions.reportError(res)(e)
      }
    }

    static async unsubscribe(req, res) {
      if (!req.user)
        return res.status(401).jsonp({ err: 'Not found' })

      try {
        var user = await models.User.findByUsername(req.params.username)
        var timelineId = await user.getPostsTimelineId()
        await req.user.validateCanUnsubscribe(timelineId)
        await req.user.unsubscribeFrom(timelineId)

        var json = await new MyProfileSerializer(req.user).promiseToJSON()
        res.jsonp(json)
      } catch(e) {
        exceptions.reportError(res)(e)
      }
   }

    static async update(req, res) {
      if (!req.user || req.user.id != req.params.userId)
        return res.status(401).jsonp({ err: 'Not found' })

      var attrs = {
        screenName: req.body.user.screenName,
        email: req.body.user.email,
        isPrivate: req.body.user.isPrivate
      }
      try {
        var user = await req.user.update(attrs)
        var json = await new MyProfileSerializer(user).promiseToJSON()
        res.jsonp(json)
      } catch(e) {
        exceptions.reportError(res)(e)
      }
    }

    static async updatePassword(req, res) {
      if (!req.user)
        return res.status(401).jsonp({ err: 'Not found' })

      var currentPassword = req.body.currentPassword || ''
      try {
        var valid = await req.user.validPassword(currentPassword)
        if (!valid)
          throw new Error('Your old password is not valid')
        await req.user.updatePassword(req.body.password, req.body.passwordConfirmation)
        return res.jsonp({ message: 'Your password has been changed' })
      } catch(e) {
        exceptions.reportError(res)(e)
      }
    }

    static async updateProfilePicture(req, res) {
      if (!req.user)
        return res.status(401).jsonp({ err: 'Not found' })

      var form = new formidable.IncomingForm()

      form.on('file', async function(inputName, file) {
        try {
          await req.user.updateProfilePicture(file)
          res.jsonp({ message: 'Your profile picture has been updated' })
        } catch (e) {
          exceptions.reportError(res)(e)
        }
      })

      form.parse(req)
    }
  }

  return UsersController
}
