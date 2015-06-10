var models = require("../../app/models")
  , Group = models.Group

describe('Group', function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe('#create()', function() {
    it('should create without error', function(done) {
      var group = new Group({
        username: 'FriendFeed'
      })
      var ownerId = 'abc'

      group.create(ownerId)
        .then(function(group) {
          group.should.be.an.instanceOf(Group)
          group.should.not.be.empty
          group.should.have.property('id')

          return group
        })
        .then(Group.findById(group.id))
        .then(function(newGroup) {
          newGroup.should.be.an.instanceOf(Group)
          newGroup.should.not.be.empty
          newGroup.should.have.property('id')
          newGroup.id.should.eql(group.id)
          newGroup.should.have.property('type')
          newGroup.type.should.eql('group')

          return Group.findByUsername(group.username)
        })
        .then(function(groupByName) {
          groupByName.id.should.eql(group.id)
          groupByName.should.be.an.instanceOf(Group)
          return groupByName.getAdministratorIds()
        })
        .then(function(adminIds) {
          adminIds.should.contain(ownerId)
        })
        .then(function() { done() })
    })

    it('should create with null screenName', function(done) {
      var group = new Group({
        username: 'username',
        screenName: null
      })

      group.create()
        .then(function(newGroup) {
          newGroup.should.be.an.instanceOf(Group)
          newGroup.should.not.be.empty
          newGroup.should.have.property('id')
          newGroup.id.should.eql(group.id)
          newGroup.should.have.property('type')
          newGroup.type.should.eql('group')
          group.should.have.property('screenName')
          newGroup.screenName.should.eql(group.username)
        })
        .then(function() { done() })
    })

    it('should not create with tiny screenName', function(done) {
      var group = new Group({
        username: 'FriendFeed',
        screenName: 'a'
      })

      group.create()
        .catch(function(e) {
          e.message.should.eql("Invalid")
          done()
        })
    })

    it('should not create with username that already exists', function(done) {
      var groupA = new Group({
        username: 'FriendFeedA',
        screenName: 'FriendFeedA'
      })

      var groupB = new Group({
        username: 'FriendFeedA',
        screenName: 'FriendFeedB'
      })

      groupA.create()
        .then(function() { return groupB.create() })
        .catch(function(e) {
          e.message.should.eql("Already exists")
          done()
        })
    })
  })

  describe('#update()', function() {
    it('should update without error', function(done) {
      var screenName = 'Pepyatka'
      var group = new Group({
        username: 'FriendFeed'
      })

      group.create()
        .then(function(group) {
          group.should.be.an.instanceOf(Group)
          group.should.not.be.empty
          group.should.have.property('id')
          group.should.have.property('screenName')

          return group
        })
        .then(group.update({
          screenName: screenName
        }))
        .then(function(newGroup) {
          newGroup.should.be.an.instanceOf(Group)
          newGroup.should.not.be.empty
          newGroup.should.have.property('id')
          newGroup.id.should.eql(group.id)
          newGroup.should.have.property('type')
          newGroup.type.should.eql('group')
          group.should.have.property('screenName')
          newGroup.screenName.should.eql(screenName)
        })
        .then(function() { done() })
    })

    it('should update without screenName', function(done) {
      var screenName = 'Luna'
      var group = new Group({
        username: 'Luna',
        screenName: screenName
      })

      group.create()
        .then(function(group) {
          return group.update({})
        })
        .then(function(newGroup) {
          newGroup.should.be.an.instanceOf(Group)
          newGroup.should.not.be.empty
          newGroup.should.have.property('id')
          newGroup.screenName.should.eql(screenName)
        })
        .then(function() { done() })
    })
  })

  describe('#isValidUsername()', function() {
    var valid = ['luna', '12345', 'hello1234', 'save-our-snobs',
                   ' group', 'group '] // automatically trims
    valid.forEach(function(username) {
      it('should allow username ' + username, function(done) {

        var group = new Group({
          username: username
        })

        group.create()
          .then(function(group) { return group.isValidEmail() })
          .then(function(valid) {
            valid.should.eql(true)
          })
          .then(function() { done() })
      })
    })

    var invalid = ['lu', '-12345', 'luna-', 'hel--lo', 'абизьян', 'gr oup']
    invalid.forEach(function(username) {
      it('should not allow invalid username ' + username, function(done) {

        var group = new Group({
          username: username
        })

        group.create()
          .then(function(group) { return group.isValidEmail() })
          .catch(function(e) {
            e.message.should.eql("Invalid")
            done()
          })
      })
    })
  })

  describe('addAdministrator', function() {
    var group

    beforeEach(function(done) {
      group = new Group({
        username: 'Luna',
        screenName: 'Moon'
      })
      group.create().then(function() {
        done()
      })
    })

    it('should add an administrator', function(done) {
      group.addAdministrator('123')
        .then(function() {
          return group.getAdministratorIds()
        })
        .then(function(res) {
          res.should.contain('123')
        })
        .then(function() { done() })
    })
  })

  describe('removeAdministrator', function() {
    var group

    beforeEach(function(done) {
      group = new Group({
        username: 'Luna',
        screenName: 'Moon'
      })
      group.create('123').then(function() {
        group.addAdministrator('456').then(function() {
          done()
        })
      })
    })

    it('should remove an administrator', function(done) {
      group.removeAdministrator('123')
          .then(function() {
            return group.getAdministratorIds()
          })
          .then(function(res) {
            res.length.should.eql(1)
          })
          .then(function() { done() })
    })

    it('should refuse to remove the last administrator', function(done) {
      group.removeAdministrator('456')
          .then(function() {
            return group.removeAdministrator('123')
          })
          .catch(function(e) {
            e.message.should.eql("Cannot remove last administrator")
            done()
          })
    })
  })
})
