var models = require("../../app/models")
  , FeedFactory = models.FeedFactory
  , User = models.User
  , Group = models.Group

describe('FeedFactory', function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe('#findById()', function() {
    it('should find user with a valid id', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) { return FeedFactory.findById(user.id) })
        .then(function(newUser) {
          newUser.should.be.an.instanceOf(User)
          newUser.should.not.be.empty
          newUser.should.have.property('id')
          newUser.id.should.eql(user.id)

          done()
        })
    })
  })

  describe('#findByName()', function() {
    it('should find user with a valid name', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) { return FeedFactory.findByUsername(user.username) })
        .then(function(newUser) {
          newUser.should.be.an.instanceOf(User)
          newUser.should.not.be.empty
          newUser.should.have.property('id')
          newUser.id.should.eql(user.id)

          done()
        })
    })

    it('should find group with a valid name', function(done) {
      var group = new Group({
        username: 'Luna'
      })

      group.create()
        .then(function(group) { return FeedFactory.findByUsername(group.username) })
        .then(function(newGroup) {
          newGroup.should.be.an.instanceOf(Group)
          newGroup.should.not.be.empty
          newGroup.should.have.property('id')
          newGroup.id.should.eql(group.id)

          done()
        })
    })
  })
})
