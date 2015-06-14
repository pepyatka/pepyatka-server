"use strict";

import passport from "passport"
import jwt from "jsonwebtoken"
import _ from "lodash"

import config_loader from "../../../../config/config"
import {UserSerializer} from "../../../models"

var config = config_loader.load()

exports.addController = function(app) {
  class SessionController {
    static create(req, res) {
      passport.authenticate('local', function(err, user, msg) {
        if (err) {
          return res.status(401).jsonp({ err: err.message })
        }

        var secret = config.secret
        var authToken = jwt.sign({ userId: user.id }, secret)

        new UserSerializer(user).toJSON(function(err, json) {
          return res.jsonp(_.extend(json, { authToken: authToken }))
        })
      })(req, res)
    }
  }

  return SessionController
}
