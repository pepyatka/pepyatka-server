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

App.Post = Ember.Object.extend();
App.Post.reopenClass({
  find: function(){
    this.allPosts = []

    $.ajax({
      url: 'http://localhost:3000/v1/timeline/anonymous',
      dataType: 'jsonp',
      context: this,
      success: function(response){
        response.forEach(function(post){
          this.allPosts.addObject(App.Post.create(post))
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

