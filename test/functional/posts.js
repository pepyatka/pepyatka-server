var request = require('supertest')
  , agent = require('superagent')
  , assert = require('assert')
  , async = require('async')

var server = require('../../server')
  , models = require('../../app/models')

describe('Post API', function() {
  var userAgent;

  before(function(done) {
    var newUser = new models.User({
      username: 'username',
      password: 'password'
    })
    newUser.save(function(err, user) {
      userAgent = agent.agent();
      userAgent
        .post('localhost:' + server.get('port') + '/session')
        .send({ username: 'username', password: 'password' })
        .end(function(err, res) {
          done()
        });

    })
  })

  it('GET /v1/posts/this-post-does-not-exist should return 404', function(done) {
    request(server)
      .get('/v1/posts/this-post-does-not-exist')
      .expect(404, done)
  })

  it('GET /v1/posts/:postId should return json post', function(done) {
    models.User.findAnon(function(err, user) {
      user.newPost({
        body: 'postBody'
      }, function(err, newPost) {
        newPost.create(function(err, post) {
          request(server)
            .get('/v1/posts/' + post.id)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function(err, res) {
              assert.equal(err, null)

              var jsonPost = res.body
              assert.equal(post.id, jsonPost.id)
              assert.equal(post.body, jsonPost.body)
              assert.equal(post.createdAt, jsonPost.createdAt)
              // Read defect in post.create() function
              // assert.equal(post.updatedAt, jsonPost.updatedAt)
              assert(Array.isArray(jsonPost.comments))
              assert.equal(jsonPost.comments.length, 0)
              assert(Array.isArray(jsonPost.attachments))
              assert.equal(jsonPost.attachments.length, 0)
              done()
            })
        })
      })
    })
  })

  it('POST /v1/posts should create post and return json object', function(done) {
    var params = { 
      body: 'postBody'
    }
    request(server)
      .post('/v1/posts')
      .send(params)
      .expect(200)
      .end(function(err, res) {
        assert.equal(err, null)

        var jsonPost = res.body
        assert(!!jsonPost.id)
        assert(!!jsonPost.createdAt)
        assert(!!jsonPost.updatedAt)
        assert.equal(params.body, jsonPost.body)
        // XXX: test userId
        assert(Array.isArray(jsonPost.comments))
        assert.equal(jsonPost.comments.length, 0)
        assert(Array.isArray(jsonPost.attachments))
        assert.equal(jsonPost.attachments.length, 0)

        done()
      })
  })

  it('POST /v1/posts with gif attachment should create post and return json object', function(done) {
    var params = { 
      body: 'postBody'
    }
    request(server)
      .post('/v1/posts')
      .attach('file-0', 'test/fixtures/animated.gif')
      .field('body', params.body)
      .expect(200)
      .end(function(err, res) {
        assert.equal(err, null)

        var jsonPost = res.body
        assert(!!jsonPost.id)
        assert(!!jsonPost.createdAt)
        assert(!!jsonPost.updatedAt)
        assert.equal(params.body, jsonPost.body)
        // XXX: test userId
        assert(Array.isArray(jsonPost.comments))
        assert.equal(jsonPost.comments.length, 0)

        assert(Array.isArray(jsonPost.attachments))
        assert.equal(jsonPost.attachments.length, 1)
        var jsonAttachment = jsonPost.attachments[0]
        assert(!!jsonAttachment.id)
        // TODO: content-disposition
        // assert.equal(jsonAttachment.ext, 'gif')
        // assert.equal(jsonAttachment.filename, 'animated.gif')
        // XXX
        // assert(!!jsonAttachment.fsPath)
        assert(!!jsonAttachment.path)

        assert(!!jsonAttachment.thumbnail)
        var jsonThumbnail = jsonAttachment.thumbnail
        assert(!!jsonThumbnail.id)
        // TODO: content-disposition
        // assert.equal(jsonThumbnail.ext, 'gif')
        // assert.equal(jsonThumbnail.filename, 'animated.gif')
        assert(!!jsonThumbnail.path)
        // XXX
        // assert(!!jsonThumbnail.fsPath)

        done()
      })
  })

  it('POST /v1/posts with zip attachment should create post and return json object without attachment', function(done) {
    var params = { 
      body: 'postBody'
    }
    request(server)
      .post('/v1/posts')
      .attach('file-0', 'test/fixtures/blank.zip')
      .field('body', params.body)
      .expect(200)
      .end(function(err, res) {
        assert.equal(err, null)
        
        var jsonPost = res.body
        assert(!!jsonPost.id)
        assert(!!jsonPost.createdAt)
        assert(!!jsonPost.updatedAt)
        assert.equal(params.body, jsonPost.body)
        // XXX: test userId
        assert(Array.isArray(jsonPost.comments))
        assert.equal(jsonPost.comments.length, 0)
        assert(Array.isArray(jsonPost.attachments))
        assert.equal(jsonPost.attachments.length, 0)

        done()
      })
  })

  it('POST /v1/posts with missing body should return 200', function(done) {
    var params = {
      userId: 'userId'
    }
    request(server)
      .post('/v1/posts')
      .send(params)
      .expect(422, done)
  })

  it('DELETE /v1/posts/:postId should remove post', function(done) {
    models.User.findByUsername('username', function(err, user) {
      user.newPost({
        body: 'postBody'
      }, function(err, newPost) {
        newPost.create(function(err, post) {
          var params = {
            '_method': 'delete'
          }
          userAgent
            .post('localhost:' + server.get('port') + '/v1/posts/' + post.id)
            .send(params)
            .end(function(err, res) {
              // TODO: res should have status 200
              models.Post.findById(post.id, function(err, post) {
                assert.equal(err, null)
                assert.equal(post, null)
                done()
              })
            })
        })
      })
    })
  })

  it('PATCH /v1/posts/:postId should edit post', function(done) {
    models.User.findByUsername('username', function(err, user) {
      user.newPost({
        body: 'postBody'
      }, function(err, newPost) {
        newPost.create(function(err, post) {
          var params = {
            body: 'newPostBody',
            '_method': 'patch'
          }
          userAgent
            .post('localhost:' + server.get('port') + '/v1/posts/' + post.id)
            .send(params)
            .end(function(res) {
              // TODO: res should have status 200
              models.Post.findById(post.id, function(err, updatedPost) {
                assert.equal(err, null)
                assert.equal(updatedPost.body, params.body)
                done()
              })
            })
        })
      })
    })
  })

  it('POST /v1/posts/:postId/like should add like to post', function(done) {
    var that = {}

    var addPostByAnon = function(callback) {
      models.User.findAnon(function(err, anonymous) {
        anonymous.newPost({
          body: 'postBody'
        },
          function(err, newPost) {
            newPost.create(function(err, post) {
              that.postId = post.id
              callback()
            })
        })
      })
    }

    var addLikeByUser = function(callback) {
      userAgent
        .post('localhost:' + server.get('port') + '/v1/posts/' + that.postId + '/like')
        .end(function(res) {
          // TODO: res should have status 200
          callback()
        })
    }

    var checkUserLikeTimeline = function(callback) {
      models.User.findByUsername('username', function(err, user) {
        user.getLikesTimeline({start: 0}, function(err, timeline) {
          timeline.getPostsIds(0, 25, function(err, postsIds) {
            var isLikeAdded = false;
            async.forEach(postsIds, function(postId, done) {
              if (that.postId == postId) isLikeAdded = true
              done()
            },
            function(err) {
              assert(isLikeAdded)
              callback()
            })
          })
        })
      })
    }

    var checkPostLikes = function(callback) {
      models.Post.findById(that.postId, function(err, post) {
        post.getLikes(function(err, likes) {
          var isLikeAdded = false
          async.forEach(likes, function(like, done) {
            if (like.username == 'username') isLikeAdded = true
            done()
          },
          function(err) {
            assert(isLikeAdded)
            callback()
          })
        })
      })
    }

    addPostByAnon(function() {
      addLikeByUser(function() {
        async.parallel([
          function(done){
            checkPostLikes(done)
          },
          function(done) {
            checkUserLikeTimeline(done)
          }
        ], function(err) {
          done()
        })
      })
    })
  })

  it('POST /v1/posts/:postId/unlike should remove like from post', function(done) {
    var that = {}

    var addPostByAnon = function(callback) {
      models.User.findAnon(function(err, anonymous) {
        anonymous.newPost({
            body: 'postBody'
          },
          function(err, newPost) {
            newPost.create(function(err, post) {
              that.postId = post.id
              callback()
            })
          })
      })
    }

    var addLikeByUser = function(callback) {
      userAgent
        .post('localhost:' + server.get('port') + '/v1/posts/' + that.postId + '/like')
        .end(function(res) {
          // TODO: res should have status 200
          callback()
        })
    }

    var removeUserLike = function(callback) {
      userAgent
        .post('localhost:' + server.get('port') + '/v1/posts/' + that.postId + '/unlike')
        .end(function(res) {
          // TODO: res should have status 200
          callback()
        })
    }

    var checkUserLikeTimeline = function(callback) {
      models.User.findByUsername('username', function(err, user) {
        user.getLikesTimeline({start: 0}, function(err, timeline) {
          timeline.getPostsIds(0, 25, function(err, postsIds) {
            console.log(postsIds)
            console.log(that.postId)
            var isLikeAdded = false;
            async.forEach(postsIds, function(postId, done) {
                if (that.postId == postId) isLikeAdded = true
                done()
              },
              function(err) {
                assert.equal(isLikeAdded, false)
                callback()
              })
          })
        })
      })
    }

    var checkPostLikes = function(callback) {
      models.Post.findById(that.postId, function(err, post) {
        post.getLikes(function(err, likes) {
          var isLikeAdded = false
          async.forEach(likes, function(like, done) {
              if (like.username == 'username') isLikeAdded = true
              done()
            },
            function(err) {
              assert.equal(isLikeAdded, false)
              callback()
            })
        })
      })
    }

    addPostByAnon(function() {
      addLikeByUser(function() {
        removeUserLike(function() {
          async.parallel([
            function(done){
              checkPostLikes(done)
            },
            function(done) {
              checkUserLikeTimeline(done)
            }
          ], function(err) {
            done()
          })
        })
      })
    })
  })

  it('POST /v1/posts/not-exist-postId/like should return 422', function(done) {
    request(server)
      .post('/v1/posts/not-exist-postId/like')
      .expect(422, done)
  })

  it('POST /v1/posts/not-exist-postId/unlike should return 422', function(done) {
    request(server)
      .post('/v1/posts/not-exist-postId/unlike')
      .expect(422, done)
  })

  it('POST /v1/posts/:postId/like like post two time', function(done) {
    var that = {}

    var addPostByAnon = function(callback) {
      models.User.findAnon(function(err, anonymous) {
        anonymous.newPost({
            body: 'postBody'
          },
          function(err, newPost) {
            newPost.create(function(err, post) {
              that.postId = post.id
              callback()
            })
          })
      })
    }

    var addLikeByUser = function(callback) {
      userAgent
        .post('localhost:' + server.get('port') + '/v1/posts/' + that.postId + '/like')
        .end(function(res) {
          // TODO: res should have status 200
          callback()
        })
    }

    var checkUserLikeTimeline = function(callback) {
      models.User.findByUsername('username', function(err, user) {
        user.getLikesTimeline({start: 0}, function(err, timeline) {
          timeline.getPostsIds(0, 25, function(err, postsIds) {
            var likeCount = 0;
            async.forEach(postsIds, function(postId, done) {
                if (that.postId == postId) likeCount++
                done()
              },
              function(err) {
                assert.equal(likeCount, 1)
                callback()
              })
          })
        })
      })
    }

    var checkPostLikes = function(callback) {
      models.Post.findById(that.postId, function(err, post) {
        post.getLikes(function(err, likes) {
          var likeCount = 0;
          async.forEach(likes, function(like, done) {
              if (like.username == 'username') likeCount++
              done()
            },
            function(err) {
              assert.equal(likeCount, 1)
              callback()
            })
        })
      })
    }

    addPostByAnon(function() {
      addLikeByUser(function() {
        addLikeByUser(function() {
          async.parallel([
            function(done){
              checkPostLikes(done)
            },
            function(done) {
              checkUserLikeTimeline(done)
            }
          ], function(err) {
            done()
          })
        })
      })
    })
  })

  it('POST /v1/posts/:postId/unlike when post is not liked', function(done) {
    var that = {}

    var addPostByAnon = function(callback) {
      models.User.findAnon(function(err, anonymous) {
        anonymous.newPost({
            body: 'postBody'
          },
          function(err, newPost) {
            newPost.create(function(err, post) {
              that.postId = post.id
              callback()
            })
          })
      })
    }

    var removeUserLike = function(callback) {
      userAgent
        .post('localhost:' + server.get('port') + '/v1/posts/' + that.postId + '/unlike')
        .end(function(res) {
          // TODO: res should have status 200
          callback()
        })
    }

    addPostByAnon(function() {
      removeUserLike(function() {
        done()
      })
    })
  })
})
