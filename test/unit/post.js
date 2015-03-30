var models = require("../../app/models")
  , User = models.User
  , Post = models.Post
  , Comment = models.Comment

describe('Post', function() {
  beforeEach(function(done) {
    $database.flushdbAsync()
      .then(function() { done() })
  })

  describe('#update()', function() {
    var userA
      , post

    beforeEach(function(done) {
      userA = new User({
        username: 'Luna',
        password: 'password'
      })

      var postAttrs = { body: 'Post body' }

      userA.create()
        .then(function(user) { return userA.newPost(postAttrs) })
        .then(function(newPost) { return newPost.create() })
        .then(function(newPost) {
          post = newPost
          done()
        })
    })

    it('should update without error', function(done) {
      var body = 'Body'
      var attrs = {
        body: body
      }

      post.update(attrs)
        .then(function(newPost) {
          newPost.should.be.an.instanceOf(Post)
          newPost.should.not.be.empty
          newPost.should.have.property('body')
          newPost.body.should.eql(post.body)
        })
        .then(function() { done() })
    })
  })

  describe('#create()', function() {
    var user

    beforeEach(function(done) {
      user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) { done() })
    })

    it('should create without error', function(done) {
      var post = new Post({
        body: 'Post body',
        userId: user.id
      })

      post.create()
        .then(function(post) {
          post.should.be.an.instanceOf(Post)
          post.should.not.be.empty
          post.should.have.property('id')

          return post
        })
        .then(function(post) { return Post.findById(post.id) })
        .then(function(newPost) {
          newPost.should.be.an.instanceOf(Post)
          newPost.should.not.be.empty
          newPost.should.have.property('id')
          newPost.id.should.eql(post.id)
        })
        .then(function() { done() })
    })

    it('should ignore whitespaces in body', function(done) {
      var body = '   Post body    '
      var post = new Post({
        body: body,
        userId: user.id
      })

      post.create()
        .then(function(post) { return Post.findById(post.id) })
        .then(function(newPost) {
          newPost.should.be.an.instanceOf(Post)
          newPost.should.not.be.empty
          newPost.should.have.property('id')
          newPost.id.should.eql(post.id)
          newPost.body.should.eql(body.trim())
        })
        .then(function() { done() })
    })

    it('should save valid post to users timeline', function(done) {
      var post = new Post({
        body: 'Post',
        userId: user.id
      })

      post.create()
        .then(function(post) { return post.getSubscribedTimelineIds() })
        .then(function(timelines) {
          timelines.should.not.be.empty
          timelines.length.should.eql(2)
        })
        .then(function() { done() })
    })

    it('should return no posts from blank timeline', function(done) {
      user.getRiverOfNewsTimeline()
        .then(function(timeline) { return timeline.getPosts() })
        .then(function(posts) {
          posts.should.be.empty
        })
        .then(function() { done() })
    })

    it('should return valid post from users timeline', function(done) {
      var post = new Post({
        body: 'Post',
        userId: user.id
      })

      post.create()
        .then(function(post) { return user.getRiverOfNewsTimeline() })
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

    it('should not create with empty body', function(done) {
      var post = new Post({
        body: '',
        userId: user.id
      })

      post.create()
        .catch(function(e) {
          e.message.should.eql("Invalid")
          done()
        })
    })
  })

  describe('#findById()', function() {
    var user

    beforeEach(function(done) {
      user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) { done() })
    })

    it('should find post with a valid id', function(done) {
      var post = new Post({
        body: 'Post body',
        userId: user.id
      })

      post.create()
        .then(function(post) { return Post.findById(post.id) })
        .then(function(newPost) {
          newPost.should.be.an.instanceOf(Post)
          newPost.should.not.be.empty
          newPost.should.have.property('id')
          newPost.id.should.eql(post.id)
        })
        .then(function() { done() })
    })

    it('should not find post with a valid id', function(done) {
      var identifier = "post:identifier"

      Post.findById(identifier)
        .then(function(post) {
          $should.not.exist(post)
        })
        .then(function() { done() })
    })
  })

  describe('#getTimelineIds()', function() {
    var userA
      , userB
      , post

    beforeEach(function(done) {
      userA = new User({
        username: 'Luna',
        password: 'password'
      })

      userB = new User({
        username: 'Mars',
        password: 'password'
      })

      var attrs = {
        body: 'Post body'
      }

      userA.create()
        .then(function(user) { return userB.create() })
        .then(function(user) { return userB.newPost(attrs) })
        .then(function(newPost) { return newPost.create() })
        .then(function(newPost) {
          post = newPost
          return userB.getPostsTimelineId()
        })
        .then(function(timelineId) { return userA.subscribeTo(timelineId) })
        .then(function(res) { done() })
    })

    it('should copy post to subscribed River of News', function(done) {
      post.getTimelineIds()
        .then(function(timelineIds) {
          timelineIds.should.not.be.empty
          timelineIds.length.should.eql(3)
        })
        .then(function() { done() })
    })
  })

  describe('#addLike()', function() {
    var userA
      , userB
      , userC
      , post

    beforeEach(function(done) {
      userA = new User({
        username: 'Luna',
        password: 'password'
      })

      userB = new User({
        username: 'Mars',
        password: 'password'
      })

      userC = new User({
        username: 'Zeus',
        password: 'password'
      })

      var attrs = {
        body: 'Post body'
      }

      userA.create()
        .then(function(user) { return userC.create() })
        .then(function(user) { return userB.create() })
        .then(function(user) { return userB.newPost(attrs) })
        .then(function(newPost) { return newPost.create() })
        .then(function(newPost) {
          post = newPost
          return userB.getPostsTimelineId()
        })
        .then(function(timelineId) { return userA.subscribeTo(timelineId) })
        .then(function(res) { return userA.getPostsTimelineId() })
        .then(function(timelineId) { return userC.subscribeTo(timelineId) })
        .then(function(res) { done() })
    })

    it('should add like to friend of friend timelines', function(done) {
      post.addLike(userA.id)
        .then(function(res) { return userC.getRiverOfNewsTimeline() })
        .then(function(timeline) { return timeline.getPosts() })
        .then(function(posts) {
          posts.should.not.be.empty
          posts.length.should.eql(1)
          var newPost = posts[0]
          newPost.should.have.property('id')
          newPost.id.should.eql(post.id)
        })
        .then(function() { done() })
    })

    it('should add user to likes', function(done) {
      post.addLike(userA.id)
        .then(function(res) { return post.getLikes() })
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

  describe('#removeLike()', function() {
    var userA
      , userB
      , userC
      , post

    beforeEach(function(done) {
      userA = new User({
        username: 'Luna',
        password: 'password'
      })

      userB = new User({
        username: 'Mars',
        password: 'password'
      })

      userC = new User({
        username: 'Zeus',
        password: 'password'
      })

      var attrs = {
        body: 'Post body'
      }

      userA.create()
        .then(function(user) { return userC.create() })
        .then(function(user) { return userB.create() })
        .then(function(user) { return userB.newPost(attrs) })
        .then(function(newPost) { return newPost.create() })
        .then(function(newPost) {
          post = newPost
          return userB.getPostsTimelineId()
        })
        .then(function(timelineId) { return userA.subscribeTo(timelineId) })
        .then(function(res) { return userA.getPostsTimelineId() })
        .then(function(timelineId) { return userC.subscribeTo(timelineId) })
        .then(function(res) { done() })
    })

    it('should remove like from friend of friend timelines', function(done) {
      post.addLike(userA.id)
        .then(function(res) { return post.removeLike(userA.id) })
        .then(function(res) { return post.getLikes() })
        .then(function(users) {
          users.should.be.empty
        })
        .then(function() { done() })
    })

    it('should add user to likes', function(done) {
      post.addLike(userA.id)
        .then(function(res) { return post.getLikes() })
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

  describe('#addComment()', function() {
    var userA
      , userB
      , userC
      , post

    beforeEach(function(done) {
      userA = new User({
        username: 'Luna',
        password: 'password'
      })

      userB = new User({
        username: 'Mars',
        password: 'password'
      })

      userC = new User({
        username: 'Zeus',
        password: 'password'
      })

      var postAttrs = { body: 'Post body' }

      userA.create()
        .then(function(user) { return userC.create() })
        .then(function(user) { return userB.create() })
        .then(function(user) { return userB.newPost(postAttrs) })
        .then(function(newPost) { return newPost.create() })
        .then(function(newPost) {
          post = newPost
          return userB.getPostsTimelineId()
        })
        .then(function(timelineId) { return userA.subscribeTo(timelineId) })
        .then(function(res) { return userA.getPostsTimelineId() })
        .then(function(timelineId) { return userC.subscribeTo(timelineId) })
        .then(function(res) { done() })
    })

    it('should add comment to friend of friend timelines', function(done) {
      var commentAttrs = {
        body: 'Comment body',
        postId: post.id
      }
      userA.newComment(commentAttrs)
        .then(function(comment) { return comment.create() })
        .then(function(res) { return userC.getRiverOfNewsTimeline() })
        .then(function(timeline) { return timeline.getPosts() })
        .then(function(posts) {
          posts.should.not.be.empty
          posts.length.should.eql(1)
          var newPost = posts[0]
          newPost.should.have.property('id')
          newPost.id.should.eql(post.id)
        })
        .then(function() { done() })
    })
  })

  describe('#getComments()', function() {
    var userA
      , post
      , comment

    beforeEach(function(done) {
      userA = new User({
        username: 'Luna',
        password: 'password'
      })

      var postAttrs = { body: 'Post body' }

      userA.create()
        .then(function(user) { return userA.newPost(postAttrs) })
        .then(function(newPost) { return newPost.create() })
        .then(function(newPost) {
          post = newPost
          var commentAttrs = {
            body: 'Comment body',
            postId: post.id
          }
          return userA.newComment(commentAttrs)
        })
        .then(function(comment) { return comment.create() })
        .then(function(newComment) {
          comment = newComment
          return comment
        })

        .then(function(res) { done() })
    })

    it('should get comments', function(done) {
      post.getComments()
        .then(function(comments) {
          comments.should.not.be.empty
          comments.length.should.eql(1)
          var newComment = comments[0]
          newComment.should.have.property('id')
          newComment.id.should.eql(comment.id)
        })
        .then(function() { done() })
    })
  })

  describe('#destroy()', function() {
    var user

    beforeEach(function(done) {
      user = new User({
        username: 'Luna',
        password: 'password'
      })

      user.create()
        .then(function(user) { done() })
    })

    it('should create without error', function(done) {
      var post = new Post({
        body: 'Post body',
        userId: user.id
      })

      post.create()
        .then(function(newPost) {
          var commentAttrs = {
            body: 'Comment body',
            postId: post.id
          }

          post = newPost
          return user.newComment(commentAttrs)
        })
        .then(function(comment) { return comment.create() })
        .then(function() { return post.destroy() })
        .then(function() { return Post.findById(post.id) })
        .then(function(post) {
          (post === null).should.be.true
          done()
        })
    })
  })
})
