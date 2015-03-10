var models = require("../../app/models")
  , User = models.User

describe('User', function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(done())
  })

  describe('#validPassword()', function() {
    it('should validate valid password', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) { return user.validPassword('password') })
        .then(function(valid) {
          valid.should.eql(true)
        })
        .then(done())
    })

    it('should not validate invalid password', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) { return user.validPassword('drowssap') })
        .then(function(valid) {
          valid.should.eql(false)
        })
        .then(done())
    })
  })

  describe('#update()', function() {
    it('should update with error', function(done) {
      var screenName = 'Mars'
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) {
          return user.update({
            screenName: screenName
          })
        })
        .then(function(newUser) {
          newUser.should.be.an.instanceOf(User)
          newUser.should.not.be.empty
          newUser.should.have.property('id')
          newUser.screenName.should.eql(screenName)
        })
        .then(done())
    })

    it('should update without screenName', function(done) {
      var screenName = 'Luna'
      var user = new User({
        username: 'Luna',
        screenName: screenName,
        password: 'password'
      })

      user.create()
        .then(function(user) {
          return user.update({
          })
        })
        .then(function(newUser) {
          newUser.should.be.an.instanceOf(User)
          newUser.should.not.be.empty
          newUser.should.have.property('id')
          newUser.screenName.should.eql(screenName)
        })
        .then(done())
    })

    it('should not update with blank screenName', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) {
          return user.update({
            screenName: ''
          })
        })
        .catch(function(e) {
          e.message.should.eql("Invalid")
        })
        .then(done())
    })
  })

  describe('#create()', function() {
    it('should create without error', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) {
          user.should.be.an.instanceOf(User)
          user.should.not.be.empty
          user.should.have.property('id')

          return user
        })
        .then(User.findById(user.id))
        .then(function(newUser) {
          newUser.should.be.an.instanceOf(User)
          newUser.should.not.be.empty
          newUser.should.have.property('id')
          newUser.id.should.eql(user.id)
        })
        .then(done())
    })

    it('should ignore whitespaces in username', function(done) {
      var username = ' Luna  '
        , user = new User({
          username: username,
          password: 'password'
        })

      user.create()
        .then(function(user) {
          user.should.be.an.instanceOf(User)
          user.should.not.be.empty
          user.should.have.property('id')

          return user
        })
        .then(User.findById(user.id))
        .then(function(newUser) {
          newUser.should.be.an.instanceOf(User)
          newUser.should.not.be.empty
          newUser.should.have.property('id')
          newUser.id.should.eql(user.id)
          newUser.username.should.eql(username.trim().toLowerCase())
        })
        .then(done())
    })

    it('should not create with empty password', function(done) {
      var user = new User({
        username: 'Luna',
        password: ''
      })

      user.create()
        .catch(function(e) {
          e.message.should.eql("Invalid")
        })
        .then(done)
    })

    it('should not create empty hashed password', function(done) {
      var user = new User({
        username: 'Luna',
        password: ''
      })

      user.updateHashedPassword()
        .catch(function(e) {
          e.message.should.eql("Password cannot be blank")
        })
        .then(done)
    })

    it('should not create two users with the same username', function(done) {
      var userA
        , userB

      userA = new User({
        username: 'Luna',
        password: 'password'
      })

      userB = new User({
        username: 'luna',
        password: 'password'
      })

      userA.create()
        .then(function(user) { return userB.create() })
        .catch(function(e) {
          e.message.should.eql("Invalid")
        })
        .then(done)
    })

    it('should not create user from stop-list', function(done) {
      var user = new User({
        username: 'Public',
        password: 'password'
      })

      user.create()
        .catch(function(e) {
          e.message.should.eql("Invalid")
        })
        .then(done)
    })
  })

  describe('#findById()', function() {
    it('should not find user with an invalid id', function(done) {
      var identifier = "user:identifier"

      User.findById(identifier)
        .then(function(user) {
          $should.not.exist(user)
        })
        .then(done)
    })

    it('should find user with a valid id', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) { return user })
        .then(function(user) {
          User.findById(user.id)
            .then(function(newUser) {
              newUser.should.be.an.instanceOf(User)
              newUser.should.not.be.empty
              newUser.should.have.property('id')
              newUser.id.should.eql(user.id)
            })
        })
        .then(done)
    })
  })

  describe('#findByUsername()', function(done) {
    it('should find user with a valid username', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) { return User.findByUsername(user.username) })
        .then(function(newUser) {
          newUser.should.be.an.instanceOf(User)
          newUser.should.not.be.empty
          newUser.should.have.property('username')
          newUser.username.should.eql(user.username.toLowerCase())
        })
        .then(done)
    })
  })
})
