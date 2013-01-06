App = Ember.Application.create();

App.ApplicationView = Ember.View.extend({
  templateName: 'application'
});
App.ApplicationController = Ember.Controller.extend();

// Index view to display all posts on the page
App.PostsView = Ember.View.extend({
  templateName: 'post-list-view'
});

// Create new post text field. Separate view to be able to bind events
App.CreatePostView = Ember.TextArea.extend(Ember.TargetActionSupport, {
  attributeBindings: ['class'],

  // TODO: Extract value from controller 
  valueBinding: 'App.postsController.body', 

  insertNewline: function() {
    this.triggerAction();
  },

  didInsertElement: function() {
    this.$().focus();
  }
})

App.UploadFileView = Ember.TextField.extend({
  type: 'file',

  didInsertElement: function() {
    this.$().prettyInput()
  },

  change: function(event) {
    var input = event.target;

    if (input.files && input.files[0]) {
      var file = input.files[0]
      var reader = new FileReader();

      reader.onload = function(e) {
        App.postsController.set('attachment', {'filename': file.name, 
                                               'data': e.target.result})
      }
      reader.readAsDataURL(file);
    }
  }
});

// View to display single post. Post has following subviews (defined below):
//  - link to show a comment form
//  - form to add a new comment
App.PostContainerView = Ember.View.extend({
  templateName: 'post-view',
  isFormVisible: false,

  toggleVisibility: function() {
    this.toggleProperty('isFormVisible');
  },

  didInsertElement: function() {
    this.$().hide().slideDown('slow');
  },

  willDestroyElement: function() {
    var clone = this.$().clone();
    this.$().replaceWith(clone);
    clone.slideUp()
  },

  showAllComments: function() {
    var comments = this.content
    comments.set('partial', false)
  }
});

App.CommentContainerView = Ember.View.extend({
  templateName: 'comment-view',

  didInsertElement: function() {
    this.$().hide().slideDown('fast');
  }
})

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
  body: '',

  isVisible: function() {
    return this.get('parentView.isFormVisible') == true;
  }.property('parentView.isFormVisible'),

  autoFocus: function () {
    if (this.get('parentView.isFormVisible') == true) {
      this.$().hide().show("fast");
      this.$('input').focus();
    }
  }.observes('parentView.isFormVisible'),

  submitComment: function() {
    if (this.body) {
      // XXX: rather strange bit of code here -- potentially a defect
      var post = this.bindingContext.content || this.bindingContext;
      App.commentsController.createComment(post, this.body)
      this.set('parentView.isFormVisible', false)
      this.set('body', '')
    }
  },

  // XXX: this is a dup of App.PostContainerView.toggleVisibility()
  // function. I just do not know how to access it from UI bindings
  toggleVisibility: function() {
    this.toggleProperty('parentView.isFormVisible');
  }
});

// Create new post text field. Separate view to be able to bind events
App.CreateCommentView = Ember.TextField.extend(Ember.TargetActionSupport, {
  attributeBindings: ['class'],

  insertNewline: function() {
    this.triggerAction();
  }
})

// Separate page for a single post
App.OnePostController = Ember.ObjectController.extend();
App.OnePostView = Ember.View.extend({
  templateName: 'a-post',
  isFormVisible: false,

  toggleVisibility: function(){
    this.toggleProperty('isFormVisible');
  }
});

App.Comment = Ember.Object.extend({
  body: null,
  createdAt: null,
  user: null
});

App.CommentsController = Ember.ArrayController.extend({
  createComment: function(post, body) {
    var comment = App.Comment.create({ 
      body: body,
      postId: post.id
    });
    
    $.ajax({
      url: '/v1/comments',
      type: 'post',
      data: { body: body, postId: post.id }, // XXX: we've already defined a model above
      context: comment,
      success: function(response) {
        this.setProperties(response);
        // We do not insert comment right now, but wait for a socket event
        // post.comments.pushObject(comment)
      }
    })
    return comment;
  }
})
App.commentsController = App.CommentsController.create()

App.Post = Ember.Object.extend({
  body: null,
  createdAt: null,
  updatedAt: null,
  comments: [],
  commentsLength: 0,
  user: null,

  createdAgo: function() {
    return moment(this.get('createdAt')).fromNow();
  }.property('createdAt'),

  firstComment: function() {
    return this.get('comments')[0]
  }.property('comments'),

  lastComment: function() {
    var comments = this.get('comments')
    return comments[comments.length-1]
  }.property('comments'),

  skippedCommentsLength: function() {
    return this.get('commentsLength')-2 // display first and last comments only
  }.property('commentsLength'),

  firstThumbnailSrc: function() {
    if (this.get('attachments') && this.get('attachments')[0]) {
      return this.get('attachments')[0].thumbnail.path;
    } else {
      return false
    }
  }.property('attachments'),

  firstImageSrc: function() {
    if (this.get('attachments') && this.get('attachments')[0]) {
      return this.get('attachments')[0].path;
    } else {
      return false
    }
  }.property('attachments')

});

App.PostsController = Ember.ArrayController.extend(Ember.SortableMixin, {
  content: [],
  body: '',

  sortProperties: ['updatedAt'],
  sortAscending: false,

  // XXX: a bit strange having this method here.
  submitPost: function() {
    if (this.body) {
      App.postsController.createPost(this.body);
      this.set('body', '')
    }
  },

  removePost: function(propName, value) {
    var obj = this.findProperty(propName, value);
    this.removeObject(obj);
  },

  createPost: function(body) {
    var post = App.Post.create({ 
      body: body
    });

    $.ajax({
      url: '/v1/posts',
      type: 'post',
      data: { body: body, attachment: this.attachment }, // XXX: we've already defined a model above
      context: post,
      success: function(response) {
        this.setProperties(response);
        this.attachment = null
        
        // We do not insert post right now, but wait for a socket event
        // App.postsController.insertAt(0, post)
      }
    })
    return post;
  },

  findAll: function() {
    this.set('content', [])

    $.ajax({
      url: '/v1/timeline/anonymous',
      dataType: 'jsonp',
      context: this,
      success: function(response){
        response.posts.forEach(function(attrs) {
          var post = App.Post.create(attrs)
          this.addObject(post)
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
App.postsController = App.PostsController.create()

App.Router = Ember.Router.extend({
  // enableLogging: true,

  root: Ember.Route.extend({
    posts: Ember.Route.extend({
      route: '/',

      showPost: Ember.Route.transitionTo('aPost'),
      showAllPosts: Ember.Route.transitionTo('posts'),
      
      connectOutlets: function(router){ 
        router.get('applicationController').connectOutlet('posts', App.postsController.findAll());
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
        return App.postsController.findOne(urlParams.postId);
      }
    })
  })
});

App.initialize();

