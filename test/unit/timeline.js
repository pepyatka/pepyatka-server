var models = require("../../app/models")
  , uuid = require('uuid')
  , Timeline = models.Timeline

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
        })
        .then(function() { done() })
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
})
