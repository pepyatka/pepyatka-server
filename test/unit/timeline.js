var models = require("../../app/models")
  , uuid = require('uuid')
  , Timeline = models.Timeline
  , User = models.User

describe('Timeline', function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe('#create()', function() {
    it('should create without error', function(done) {
      var userId = uuid.v4()
      var timeline = new Timeline({
        name: 'name',
        userId: userId
      })

      timeline.create()
        .then(function(timeline) {
          timeline.should.be.an.instanceOf(Timeline)
          timeline.should.not.be.empty
          timeline.should.have.property('id')

          return timeline
        })
        .then(function(timeline) { return Timeline.findById(timeline.id) })
        .then(function(newTimeline) {
          newTimeline.should.be.an.instanceOf(Timeline)
          newTimeline.should.not.be.empty
          newTimeline.should.have.property('id')
          newTimeline.id.should.eql(timeline.id)
        })
        .then(function() { done() })
    })

    it('should ignore whitespaces in name', function(done) {
      var userId = uuid.v4()
      var name = '   name    '
      var timeline = new Timeline({
        name: name,
        userId: userId
      })

      timeline.create()
        .then(function(timeline) { return timeline })
        .then(function(timeline) { return Timeline.findById(timeline.id) })
        .then(function(newTimeline) {
          newTimeline.should.be.an.instanceOf(Timeline)
          newTimeline.should.not.be.empty
          newTimeline.should.have.property('id')
          newTimeline.id.should.eql(timeline.id)
          newTimeline.name.should.eql(name.trim())
        })
        .then(function() { done() })
    })

    it('should not create with empty name', function(done) {
      var userId = uuid.v4()
      var timeline = new Timeline({
        name: '',
        userId: userId
      })

      timeline.create()
        .catch(function(e) {
          e.message.should.eql("Invalid")
          done()
        })
    })
  })

  describe('#findById()', function() {
    it('should find timeline with a valid id', function(done) {
      var userId = uuid.v4()
      var timeline = new Timeline({
        name: 'name',
        userId: userId
      })

      timeline.create()
        .then(function(timeline) { return timeline })
        .then(function(timeline) { return Timeline.findById(timeline.id) })
        .then(function(newTimeline) {
          newTimeline.should.be.an.instanceOf(Timeline)
          newTimeline.should.not.be.empty
          newTimeline.should.have.property('id')
          newTimeline.id.should.eql(timeline.id)
        })
        .then(function() { done() })
    })

    it('should not find timeline with a valid id', function(done) {
      var identifier = "timeline:identifier"

      Timeline.findById(identifier)
        .then(function(timeline) {
          $should.not.exist(timeline)
        })
        .then(function() { done() })
    })
  })

  describe('#getPosts()', function() {
    it('should return an empty list for an empty timeline', function(done) {
      var userId = uuid.v4()
      var timeline = new Timeline({
        name: 'name',
        userId: userId
      })

      timeline.create()
        .then(function(timeline) { return timeline.getPosts() })
        .then(function(posts) {
          posts.should.be.empty
        })
        .then(function() { done() })
    })
  })

  describe('#getSubscribers()', function() {
    var userA
      , userB

    beforeEach(function(done) {
      userA = new User({
        username: 'Luna',
        password: 'password'
      })

      userB = new User({
        username: 'Mars',
        password: 'password'
      })

      userA.create()
        .then(function(user) { return userB.create() })
        .then(function(user) { done() })
    })

    it('should subscribe to timeline', function(done) {
      var attrs = {
        body: 'Post body'
      }
      var post

      userB.newPost(attrs)
        .then(function(newPost) {
          post = newPost
          return newPost.create()
        })
        .then(function(post) { return userB.getPostsTimelineId() })
        .then(function(timelineId) { return userA.subscribeTo(timelineId) })
        .then(function() { return userB.getPostsTimeline() })
        .then(function(timeline) { return timeline.getSubscribers() })
        .then(function(users) {
          users.should.not.be.empty
          users.length.should.eql(1)
          var user = users[0]
          user.should.have.property('id')
          user.id.should.eql(userA.id)
        })
        .then(function() { done() })
    })
  })
})
