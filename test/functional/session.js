import request from 'superagent'

import app from '../../index'
import models from '../../app/models'
import funcTestHelper from './functional_test_helper'

describe("SessionController", () => {
  beforeEach(funcTestHelper.flushDb())

  describe("#create()", () => {
    var user, userData;

    beforeEach(async () => {
      userData = {
        username: 'Luna',
        password: 'password'
      }
      user = new models.User(userData)

      await user.create()
    })

    it("should sign in with a valid user", function(done) {
      request
        .post(app.config.host + '/v1/session')
        .send({ username: userData.username, password: userData.password })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.should.not.be.empty
          res.body.should.have.property('users')
          res.body.users.should.have.property('id')
          res.body.users.id.should.eql(user.id)
          done()
        })
    })

    it("should not sign in with an invalid user", function(done) {
      request
        .post(app.config.host + '/v1/session')
        .send({ username: 'username', password: userData.password })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.err.should.not.be.empty
          res.body.should.have.property('err')
          res.body.err.should.equal('We could not find the nickname you provided.')
          done()
        })
    })

    it("should not sign in with an invalid password", function(done) {
      request
        .post(app.config.host + '/v1/session')
        .send({ username: userData.username, password: 'wrong' })
        .end(function(err, res) {
          res.should.not.be.empty
          res.body.err.should.not.be.empty
          res.body.should.have.property('err')
          res.body.err.should.equal('The password you provided does not match the password in our system.')
          done()
        })
    })
  })
})
