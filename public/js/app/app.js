App = Ember.Application.create();

App.ApplicationView = Ember.View.extend({
  templateName: 'application'
});
App.ApplicationController = Ember.Controller.extend();

// Index controller and view to display all posts on the page
App.AllPostsController = Ember.ArrayController.extend();
App.AllPostsView = Ember.View.extend({
  templateName: 'posts'
});

// Create new post text field. Separate view to be able to bind events
App.CreatePostView = Ember.TextField.extend(Ember.TargetActionSupport, {
  valueBinding: 'App.PostsController.postBody',

  insertNewline: function() {
    this.triggerAction();
  }
})

// View to display single post
App.PostContainer = Ember.View.extend({
  tagName: "li",
  isFormVisible: true,
  templateName: 'post-view',

  toggleVisibility: function(){
    this.toggleProperty('isFormVisible');
  }
});

// Text field to post a comment. Separate view to make it hideable
App.CommentForm = Ember.View.extend();

App.OnePostController = Ember.ObjectController.extend();
App.OnePostView = Ember.View.extend({
  templateName: 'a-post'
});

App.Post = Ember.Object.extend({
  body: null,
  created_at: null,
  comment: [],
  user: null
});

App.PostsController = Ember.ArrayController.create({
  content: [],
  postBody: '',

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
      data: { body: body },
      context: post,
      success: function(response) {
        this.setProperties(response);
        App.PostsController.insertAt(0, post)
      }
    })
    return post;
  },

  find: function() {
    $.ajax({
      url: '/v1/timeline/anonymous',
      dataType: 'jsonp',
      context: this,
      success: function(response){
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

