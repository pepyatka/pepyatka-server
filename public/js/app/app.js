App = Ember.Application.create();

App.ApplicationView = Ember.View.extend({
  templateName: 'application'
});
App.ApplicationController = Ember.Controller.extend();

// Index view to display all posts on the page
App.AllPostsView = Ember.View.extend({
  tagName: "ul",
  templateName: 'post-list-view'
});

// Create new post text field. Separate view to be able to bind events
App.CreatePostView = Ember.TextField.extend(Ember.TargetActionSupport, {
  // TODO: Extract value from controller 
  valueBinding: 'App.PostsController.postBody', 

  insertNewline: function() {
    this.triggerAction();
  }
})

// View to display single post. Post has following subviews (defined below):
//  - link to show a comment form
//  - form to add a new comment
App.PostContainerView = Ember.View.extend({
  tagName: "li",
  templateName: 'post-view',
  isFormVisible: false,

  toggleVisibility: function(){
    this.toggleProperty('isFormVisible');
  }
});

// TODO: create view for CommentContainer and AllCommentsView
// App.CommentContainer = Ember.View.extend({
//   tagName: "li",
//   templateName: 'comment-view'
// });

// Create new post text field. Separate view to be able to bind events
App.CommentPostView = Ember.View.extend(Ember.TargetActionSupport, {
  tagName: "a",

  click: function() {
    this.triggerAction();
  }
})

// Text field to post a comment. Separate view to make it hideable
App.CommentForm = Ember.View.extend({
  // I'd no success to use isVisibleBinding property...
  classNameBindings: 'isVisible visible:invisible',
  bound: {
    body: '',
  },

  isVisible: function() {
    return this.get('parentView.isFormVisible') == true;
  }.property('parentView.isFormVisible'),

  submitComment: function() {
    if (this.bound.body) {
      var post = this.bindingContext;
      App.CommentsController.createComment(post, this.bound.body)
      this.bound.body.clear = ''
    }
  }
});

// Create new post text field. Separate view to be able to bind events
App.CreateCommentView = Ember.TextField.extend(Ember.TargetActionSupport, {
  insertNewline: function() {
    this.triggerAction();
  }
})

// Separate page for a single post
App.OnePostController = Ember.ObjectController.extend();
App.OnePostView = Ember.View.extend({
  templateName: 'a-post'
});

App.Comment = Ember.Object.extend({
  body: null,
  created_at: null,
  user: null
});

App.CommentsController = Ember.ArrayController.create({
  createComment: function(post, body) {
    var comment = App.Comment.create({ 
      body: body,
      post_id: post.id
    });
    
    $.ajax({
      url: '/v1/comments',
      type: 'post',
      data: { body: body, post_id: post.id }, // XXX: we've already defined a model above
      context: comment,
      success: function(response) {
        this.setProperties(response);
        post.comments.pushObject(comment)
        // App.PostsController.insertAt(0, comments)
      }
    })
    return comment;
  }
})

App.Post = Ember.Object.extend({
  body: null,
  created_at: null,
  comments: [],
  user: null
});

App.PostsController = Ember.ArrayController.create({
  content: [],
  postBody: '',

  // XXX: a bit strange having this method here.
  submitPost: function() {
    if (this.postBody) {
      App.PostsController.createPost(this.postBody);
      this.postBody = ''
    }
  },

  createPost: function(body) {
    var post = App.Post.create({ 
      body: body
    });

    $.ajax({
      url: '/v1/posts',
      type: 'post',
      data: { body: body }, // XXX: we've already defined a model above
      context: post,
      success: function(response) {
        this.setProperties(response);
        App.PostsController.insertAt(0, post)
      }
    })
    return post;
  },

  find: function() {
    this.set('content', [])

    $.ajax({
      url: '/v1/timeline/anonymous',
      dataType: 'jsonp',
      context: this,
      success: function(response){
        App.PostsController.content = []
        response.forEach(function(attrs) {
          var post = App.Post.create(attrs)
          this.pushObject(post)
        }, this)
      }
    })
    return this
  },

  findOne: function(postId) {
    var post = App.Post.create({
      id: postId
    });

    $.ajax({
      url: '/v1/posts/' + postId,
      dataType: 'jsonp',
      context: post,
      success: function(response){
        this.setProperties(response)
      }
    })
    return post;
  }  
})

App.Router = Ember.Router.extend({
  enableLogging: true,

  root: Ember.Route.extend({
    posts: Ember.Route.extend({
      route: '/',

      showPost: Ember.Route.transitionTo('aPost'),
      
      connectOutlets: function(router){ 
        router.get('applicationController').connectOutlet('allPosts', App.PostsController.find());
      }
    }),

    aPost: Ember.Route.extend({
      route: '/:postId',

      showAllPosts: Ember.Route.transitionTo('posts'),
      
      connectOutlets: function(router, context) {
        router.get('applicationController').connectOutlet('onePost', context);
      },

      serialize: function(router, context){
        return {postId: context.get('id')}
      },

      deserialize: function(router, urlParams) {
        return App.PostsController.findOne(urlParams.postId);
      }
    })
  })
});

App.initialize();

