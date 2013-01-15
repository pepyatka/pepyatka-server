App = Ember.Application.create();

App.ApplicationView = Ember.View.extend({
  templateName: 'application'
});
App.ApplicationController = Ember.Controller.extend();

// Index view to display all posts on the page
App.PostsView = Ember.View.extend({
  templateName: 'post-list-view',

  submitPost: function() {
    App.postsController.submitPost()
  }
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
    this.$().autogrow();
  }
})

App.UploadFileView = Ember.TextField.extend({
  type: 'file',

  didInsertElement: function() {
    this.$().prettyInput()
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
    // wrap anchor tags around links in post text
    this.$().find('.text').anchorTextUrls();
    // please read https://github.com/kswedberg/jquery-expander/issues/24
    this.$().find('.text').expander({
      slicePoint: 350,
      expandPrefix: '&hellip; ',
      preserveWords: true,
      expandText: 'more&hellip;',
      userCollapseText: '',
      collapseTimer: 0,
      expandEffect: 'fadeIn',
      collapseEffect: 'fadeOut'
    })

    if (App.postsController.get('initialCommit'))
      this.$().hide().slideDown('slow');
  },

  willDestroyElement: function() {
    var clone = this.$().clone();
    this.$().replaceWith(clone);
    clone.slideUp()
  },

  showAllComments: function() {
    this.content.set('showAllComments', true)
  }
});

App.CommentContainerView = Ember.View.extend({
  templateName: 'comment-view',

  didInsertElement: function() {
    // wrap anchor tags around links in comments
    this.$().find('.body').anchorTextUrls();
    this.$().find('.body').expander({
      slicePoint: 512,
      expandPrefix: '&hellip; ',
      preserveWords: true,
      expandText: 'more&hellip;',
      userCollapseText: '',
      collapseTimer: 0,
      expandEffect: 'fadeIn',
      collapseEffect: 'fadeOut'
    })

    if (App.postsController.get('initialCommit'))
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
App.CreateCommentView = Ember.TextArea.extend(Ember.TargetActionSupport, {
  attributeBindings: ['class'],
  rows: 1,

  insertNewline: function() {
    this.triggerAction();
  },

  didInsertElement: function() {
    this.$().autogrow();
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
  user: null,
  showAllComments: false,

  partial: function() {
    if (this.showAllComments)
      return false
    else
      return this.comments.length > 3
  }.property('showAllComments', 'comments'),

  createdAgo: function() {
    if (this.get('createdAt')) {
      return moment(this.get('createdAt')).fromNow();
    }
  }.property('createdAt'),

  firstComment: function() {
    return this.get('comments')[0]
  }.property('comments'),

  lastComment: function() {
    var comments = this.get('comments')
    return comments[comments.length-1]
  }.property('comments'),

  skippedCommentsLength: function() {
    return this.get('comments').length-2 // display first and last comments only
  }.property('comments'),

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
  isProgressBarHidden: 'hidden',
  initialCommit: false,

  sortProperties: ['updatedAt'],
  sortAscending: false,

  // XXX: a bit strange having this method here?
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
    // TODO: bind to progress property

    var data = new FormData();
    $.each($('input[type="file"]')[0].files, function(i, file) {
      // TODO: can do this just once outside of the loop
      App.postsController.set('isProgressBarHidden', 'visible')
      data.append('file-'+i, file);
    });
    data.append('body', $('.submitForm textarea')[0].value) // XXX: dirty!

    var xhr = new XMLHttpRequest();
				
    // Progress listerner.
    xhr.upload.addEventListener("progress", function (evt) {

      if (evt.lengthComputable) {
	var percentComplete = Math.round(evt.loaded * 100 / evt.total);
        App.postsController.set('progress', percentComplete)
      } else {
        // unable to compute
      }
    }, false);

    // On finished.
    xhr.addEventListener("load", function (evt) {
      // Clear file field
      var control = $('input[type="file"]')
      control.replaceWith( control.val('').clone( true ) );
      $('.file-input-name').html('')

      // var obj = $.parseJSON(evt.target.responseText);
      // TODO: bind properties
      App.postsController.set('progress', '100')
      App.postsController.set('isProgressBarHidden', 'hidden')
    }, false);

    // On failed.
    xhr.addEventListener("error", function (evt) {
      App.postsController.set('isProgressBarHidden', 'hidden')
    }, false);

    // On cancel.
    xhr.addEventListener("abort", function (evt) {
      App.postsController.set('isProgressBarHidden', 'hidden')
    }, false);

    xhr.open("post", "/v1/posts");
    xhr.send(data);

    // fallback to simple ajax if xhr is not supported
    // $.ajax({
    //   url: '/v1/posts',
    //   type: 'post',
    //   data: data,
    //   cache: false,
    //   contentType: false,
    //   processData: false,      
    //   context: post,
    //   success: function(response) {
    //     this.setProperties(response);
    //     this.attachment = null
    //     this.loading = false
    //     // We do not insert post right now, but wait for a socket event
    //     // App.postsController.insertAt(0, post)
    //   }
    // })

    return this
  },

  findAll: function() {
    this.set('initialCommit', false)
    this.set('content', [])

    $.ajax({
      url: '/v1/timeline/' + this.get('timeline'),
      dataType: 'jsonp',
      context: this,
      success: function(response){
        response.posts.forEach(function(attrs) {
          var post = App.Post.create(attrs)
          this.addObject(post)
        }, this)

        // Quite dirty solution to disable initial slideDown animation
        // on newComment and newPost
        setTimeout(function(that) {
          return function() {
            that.set('initialCommit', true)
          }
        }(this), 1000)
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
      showUserTimeline: Ember.Route.transitionTo('userTimeline'),
      
      connectOutlets: function(router){ 
        App.postsController.set('timeline', 'anonymous')
        router.get('applicationController').connectOutlet('posts', App.postsController.findAll());
      }
    }),

    // Quite bad design - mostly copy&paste of / route
    userTimeline: Ember.Route.extend({
      route: '/users/:username',

      showPost: Ember.Route.transitionTo('aPost'),
      showAllPosts: Ember.Route.transitionTo('posts'),
      showUserTimeline: Ember.Route.transitionTo('userTimeline'),

      connectOutlets: function(router, username) {
        App.postsController.set('timeline', username)
        router.get('applicationController').connectOutlet('posts', App.postsController.findAll());
      },

      serialize: function(router, username) {
        return {username: username}
      },

      deserialize: function(router, urlParams) {
        return urlParams.username
      }
    }),

    aPost: Ember.Route.extend({
      route: '/posts/:postId',

      showAllPosts: Ember.Route.transitionTo('posts'),
      showUserTimeline: Ember.Route.transitionTo('userTimeline'),
      
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

