var models = require("../../app/models")
  , User = models.User
  , Post = models.Post
  , Timeline = models.Timeline

describe('User', function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
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
        .then(function() { done() })
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
        .then(function() { done() })
    })
  })

  describe('#update()', function() {
    it('should update without error', function(done) {
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
        .then(function() { done() })
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
        .then(function() { done() })
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
        .then(function() { done() })
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
          newUser.should.have.property('type')
          newUser.type.should.eql('user')
        })
        .then(function() { done() })
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
        .then(function() { done() })
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
        .then(function() { done() })
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
        .then(function() { done() })
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
        .then(function() { done() })
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
        .then(function() { done() })
    })
  })

  describe('#findById()', function() {
    it('should not find user with an invalid id', function(done) {
      var identifier = "user:identifier"

      User.findById(identifier)
        .then(function(user) {
          $should.not.exist(user)
        })
        .then(function() { done() })
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
        .then(function() { done() })
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
        .then(function() { done() })
    })
  })

  describe('#getRiverOfNews()', function() {
    it('should get river of news', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) {
          return user.getRiverOfNewsTimeline()
        })
        .then(function(timeline) {
          timeline.should.be.an.instanceOf(Timeline)
          timeline.should.not.be.empty
          timeline.should.have.property('name')
          timeline.name.should.eql('RiverOfNews')
        })
        .then(function() { done() })
    })
  })

  describe('#getLikesTimeline()', function() {
    it('should get likes timeline', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) {
          return user.getLikesTimeline()
        })
        .then(function(timeline) {
          timeline.should.be.an.instanceOf(Timeline)
          timeline.should.not.be.empty
          timeline.should.have.property('name')
          timeline.name.should.eql('Likes')
        })
        .then(function() { done() })
    })
  })

  describe('#getPostsTimeline()', function() {
    it('should get posts timeline', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) {
          return user.getPostsTimeline()
        })
        .then(function(timeline) {
          timeline.should.be.an.instanceOf(Timeline)
          timeline.should.not.be.empty
          timeline.should.have.property('name')
          timeline.name.should.eql('Posts')
        })
        .then(function() { done() })
    })
  })

  describe('#getCommentsTimeline()', function() {
    it('should get comments timeline', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) {
          return user.getCommentsTimeline()
        })
        .then(function(timeline) {
          timeline.should.be.an.instanceOf(Timeline)
          timeline.should.not.be.empty
          timeline.should.have.property('name')
          timeline.name.should.eql('Comments')
        })
        .then(function() { done() })
    })
  })

  describe('#getTimelines()', function() {
    it('should return no timelines', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) { return user.getTimelines() })
        .then(function(timelines) {
          timelines.should.be.an.instanceOf(Array)
          timelines.should.be.empty
        })
        .then(function() { done() })
    })

    it('should return timelines', function(done) {
      var user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(newUser) { return user.getRiverOfNewsTimeline() })
        .then(function(timeline) { return user.getRiverOfNewsTimeline() })
        .then(function(timeline) { return user.getCommentsTimeline() })
        .then(function(timeline) { return user.getCommentsTimeline() })
        .then(function(timeline) { return user.getLikesTimeline() })
        .then(function(timeline) { return user.getLikesTimeline() })
        .then(function(timeline) { return user.getPostsTimeline() })
        .then(function(timeline) { return user.getPostsTimeline() })
        .then(function(timeline) { return user.getTimelines() })
        .then(function(timelines) {
          timelines.should.be.an.instanceOf(Array)
          timelines.should.not.be.empty
          timelines.length.should.be.eql(4)
          var timeline = timelines[0]
          timeline.should.have.property('name')
          timeline.name.should.eql('RiverOfNews')
        })
        .then(function() { done() })
    })
  })

  describe('#newPost()', function() {
    var user

    beforeEach(function(done) {
      user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) { done() })
    })

    it('should create a new post', function(done) {
      var post
      var attrs = {
        body: 'Post body'
      }

      user.newPost(attrs)
        .then(function(newPost) {
          post = newPost
          return newPost.create()
        })
        .then(function(newPost) { return Post.findById(newPost.id) })
        .then(function(newPost) {
          newPost.should.be.an.instanceOf(Post)
          newPost.should.not.be.empty
          newPost.should.have.property('id')
          newPost.id.should.eql(post.id)
        })
        .then(function() { done() })
    })

    it('should create a new post to a timeline', function(done) {
      var post
      var attrs = {
        body: 'Post body'
      }

      user.getPostsTimelineId()
        .then(function(timelineId) {
          attrs.timelineIds = [timelineId]
          return user.newPost(attrs)
        })
        .then(function(newPost) {
          post = newPost
          return newPost.create()
        })
        .then(function(newPost) { return Post.findById(newPost.id) })
        .then(function(newPost) {
          newPost.should.be.an.instanceOf(Post)
          newPost.should.not.be.empty
          newPost.should.have.property('id')
          newPost.id.should.eql(post.id)

          return user.getPostsTimeline()
        })
        .then(function(timeline) { return timeline.getPosts() })
        .then(function(posts) {
          posts.should.not.be.empty
          posts.length.should.eql(1)
          var newPost = posts[0]
          newPost.should.be.an.instanceOf(Post)
          newPost.should.not.be.empty
          newPost.should.have.property('body')
          newPost.body.should.eql(post.body)
        })
        .then(function() { done() })
    })
  })

  describe('#getPublicTimelineIds()', function() {
    it('should return all public timesline ids', function(done) {
      user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) { return user.getPublicTimelineIds() })
        .then(function(timelines) {
          timelines.should.not.be.empty
          timelines.length.should.eql(3)
        })
        .then(function(user) { done() })
    })
  })
})
