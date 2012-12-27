App = Ember.Application.create();

App.ApplicationView = Ember.View.extend({
  templateName: 'application'
});
App.ApplicationController = Ember.Controller.extend();

App.AllPostsController = Ember.ArrayController.extend();
App.AllPostsView = Ember.View.extend({
  templateName: 'posts'
});

App.OnePostController = Ember.ObjectController.extend();
App.OnePostView = Ember.View.extend({
  templateName: 'a-post'
});

App.CreatePostView = Ember.TextField.extend({
  insertNewline: function() {
    var value = this.get('value');

    if (value) {
      App.Post.createPost(value);
      this.set('value', '');
    }
  }
})

App.Post = Ember.Object.extend();
App.Post.reopenClass({
  allPosts: [],

  createPost: function(body) {
    var post = App.Post.create({ 
      body: body 
    });

    $.ajax({
      url: 'http://localhost:3000/v1/posts',
      type: 'post',
      data: { body: body },
      context: post,
      success: function(response) {
        this.setProperties(response);
        App.Post.allPosts.insertAt(0, post)
      }
    })
    return post;
  },

  find: function(){
    $.ajax({
      url: 'http://localhost:3000/v1/timeline/anonymous',
      dataType: 'jsonp',
      context: this,
      success: function(response){
        response.forEach(function(attrs){
          var post = App.Post.create(attrs)
          this.allPosts.addObject(post)
        }, this)
      }
    })
    return this.allPosts;
  },

  findOne: function(postId){
    var post = App.Post.create({
      id: postId
    });

    $.ajax({
      url: 'http://localhost:3000/v1/posts/' + postId,
      dataType: 'jsonp',
      context: post,
      success: function(response){
        this.setProperties(response)
      }
    })
    return post;
  }
});

App.Router = Ember.Router.extend({
  enableLogging: true,

  root: Ember.Route.extend({
    posts: Ember.Route.extend({
      route: '/',

      showPost: Ember.Route.transitionTo('aPost'),
      
      connectOutlets: function(router){ 
        router.get('applicationController').connectOutlet('allPosts', App.Post.find());
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
        return App.Post.findOne(urlParams.postId);
      }
    })
  })
});

App.initialize();

