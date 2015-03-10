var models = require("../../app/models")
  , Timeline = models.Timeline

describe('Timeline', function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(done())
  })

  describe('#create()', function() {
    it('should create without error', function(done) {
      var timeline = new Timeline({
        name: 'name',
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
        .then(done())
    })

    it('should ignore whitespaces in name', function(done) {
      var name = '   name    '
        , timeline = new Timeline({
          name: name,
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
        .then(done())
    })

    it('should not create with empty name', function(done) {
      var timeline = new Timeline({
        name: '',
      })

      timeline.create()
        .catch(function(e) {
          e.message.should.eql("Invalid")
        })
        .then(done())
    })
  })

  describe('#findById()', function() {
    it('should find timeline with a valid id', function(done) {
      var timeline = new Timeline({
        name: 'name',
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
        .then(done())
    })

    it('should not find timeline with a valid id', function(done) {
      var identifier = "timeline:identifier"

      Timeline.findById(identifier)
        .then(function(timeline) {
          $should.not.exist(timeline)
        })
        .then(done)
    })
  })
})
