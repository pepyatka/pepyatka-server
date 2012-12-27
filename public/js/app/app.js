App = Ember.Application.create();

App.ApplicationView = Ember.View.extend({
  templateName: 'application'
});
App.ApplicationController = Ember.Controller.extend();

App.AllPostsController = Ember.ArrayController.extend();
App.AllPostsView = Ember.View.extend({
  templateName: 'posts'
});

App.Post = Ember.Object.extend();
App.Post.reopenClass({
  allPosts: [],
  find: function(){
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
  }
});

App.Router = Ember.Router.extend({
  root: Ember.Route.extend({
    index: Ember.Route.extend({
      route: '/',
      connectOutlets: function(router){
        router.get('applicationController').connectOutlet('allPosts', App.Post.find());
      }
    })
  })
});

App.initialize();

