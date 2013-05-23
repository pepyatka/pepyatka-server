App = Ember.Application.create({
  LOG_TRANSITIONS: true
});

App.Properties = Ember.Object.extend({
  isAuthorized: false,
  username: currentUsername,
  userId: currentUser,

  // TODO: remove this function and user proper routes instead
  userLink: function() {
    return '/users/' + this.get('username')
  }.property('username'),

  isAnonym: function() {
    return this.get('username') == 'anonymous'
  }.property('username'),

  currentPath: null
})
App.properties = App.Properties.create()

App.ShowSpinnerWhileRendering = Ember.Mixin.create({
  layout: Ember.Handlebars.compile('<div {{bindAttr class="isLoaded"}}>{{ yield }}</div>'),

  classNameBindings: ['isLoaded::loading'],

  isLoaded: function() {
    return this.get('isInserted') && App.postsController.isLoaded;
  }.property('isInserted', 'App.postsController.isLoaded'),

  didInsertElement: function() {
    this.set('isInserted', true);
    this._super();
  }
});

App.PaginationHelper = Em.Mixin.create({
  pageSize: 25,
  pageStart: 0,

  nextPage: function() {
    this.incrementProperty('pageStart', this.get('pageSize'))
  },

  prevPage: function() {
    this.decrementProperty('pageStart', this.get('pageSize'))
  },

  prevPageDisabled: function() {
    return App.postsController.get('pageStart') == 0 ? 'disabled' : ''
  }.property('App.postsController.pageStart'),

  prevPageVisible: function() {
    return this.get('prevPageDisabled') != 'disabled'
  }.property('App.postsController.pageStart'),

  nextPageVisible: function() {
    return this.get('nextPageDisabled') != 'disabled'
  }.property('App.postsController.content'),

  nextPageDisabled: function() {
    var len = this.get('content.content.length')
    return len == 0 || len < this.get('pageSize') ? 'disabled' : ''
    // TODO: bind to generic content
  }.property('App.postsController.content'),

  resetPage: function() {
    this.set('pageStart', 0)
  },

  pageDidChange: function() {
    this.didRequestRange(this.get('pageStart'));
  }.observes('pageStart')
});

App.SearchPaginationHelper = Em.Mixin.create({
  pageSize: 25,
  pageStart: 0,

  nextPage: function() {
    this.incrementProperty('pageStart', this.get('pageSize'))
  },

  prevPage: function() {
    this.decrementProperty('pageStart', this.get('pageSize'))
  },

  prevPageDisabled: function() {
    return App.searchController.get('pageStart') == 0 ? 'disabled' : ''
  }.property('App.searchController.pageStart'),

  prevPageVisible: function() {
    return this.get('prevPageDisabled') != 'disabled'
  }.property('App.searchController.pageStart'),

  nextPageVisible: function() {
    return this.get('nextPageDisabled') != 'disabled'
  }.property('App.searchController.content'),

  nextPageDisabled: function() {
    var len = App.searchController.content.length;
    return len == 0 || len < this.get('pageSize') ? 'disabled' : ''
    // TODO: bind to generic content
  }.property('App.searchController.content'),

  resetPage: function() {
    this.set('pageStart', 0)
  },

  pageDidChange: function() {
    this.didRequestRange(this.get('pageStart'));
  }.observes('pageStart')
});

App.Tags = Ember.View.extend({
  resourceUrl: '/v1/tags',

  templateName: 'tags',
  tagName: 'ul',

  willInsertElement: function() {
    var that = this

    $.ajax({
      url: this.resourceUrl,
      type: 'get',
      success: function(response) {
        that.set('content', response)
      }
    })
  }
});

App.GroupsController = Ember.ArrayController.extend({
  resourceUrl: '/v1/users/',
  suffix: '/subscriptions',
  content: [],

  // TODO: rename "groupName" property just to "name"
  create: function() {
    $.ajax({
      url: this.resourceUrl,
      data: { username: this.get('groupName') },
      dataType: 'jsonp',
      type: 'post',
      context: this,
      success: function(response) {
        switch (response.status) {
        case 'success' :
          App.groupsController.addObject(this.get('groupName'))
          this.transitionToRoute('users', this.get('groupName'))
          break
        case 'fail' :
          this.transitionToRoute('groups')
          break
        }
      }
    })
    return this
  },

  // TODO: rename to findAll
  loadGroups: function() {
    var that = this

    $.ajax({
      url: this.resourceUrl + App.properties.get('username') + this.suffix,
      type: 'get',
      success: function(response) {
        var groups = []
        response.forEach(function(subscription) {
          if (subscription.user.type == 'group' && groups.indexOf(subscription.user.username) == -1) {
            groups.push(subscription.user.username)
          }
        }, this)
        that.set('content', groups)
      }
    })

    return this
  }
})
App.groupsController = App.GroupsController.create()

App.GroupsView = Ember.View.extend({
  resourceUrl: '/v1/users/',
  suffix: '/subscriptions',

  templateName: 'groups',
  tagName: 'ul',

  willInsertElement: function() {
    App.groupsController.loadGroups()
  }
});

App.SearchPagination = Ember.View.extend({
  templateName: 'search-pagination'
});

App.Pagination = Ember.View.extend({
  templateName: 'pagination'
});

App.Subscription = Ember.Object.extend({
  socket: null,
  subscribedTo: {},

  init: function() {
    var that = this

    var isFirstPage = function() {
      switch (App.properties.get('currentPath')) {
      case "aPost":
        return true
      case "root":
      case "posts":
      case "userTimeline":
      case "publicTimeline":
      case "userLikesTimeline":
      case "userCommentsTimeline":
        return App.postsController.pageStart == 0
      case "searchPhrase":
        return App.searchController.pageStart == 0
      }
    }

    var findPost = function(postId) {
      switch (App.properties.get('currentPath')) {
      case "aPost":
        if (App.onePostController.content.id == postId)
          return App.onePostController.content
      case "root":
      case "posts":
      case "userTimeline":
      case "publicTimeline":
      case "userLikesTimeline":
      case "userCommentsTimeline":
        return App.postsController.find(function(post) {
          return post.id == postId
        })
      case "searchPhrase":
        return App.searchController.find(function(post) {
          return post.id == postId
        })
      }
    }

    this.socket = io.connect('/');

    this.socket.on('newPost', function (data) {
      if (!isFirstPage())
        return

      var post = App.Post.create(data.post)
      App.postsController.addObject(post)
    });

    this.socket.on('updatePost', function(data) {
      var post = findPost(data.post.id)

      if (post) {
        post.set('body', data.post.body)
      }
    })

    this.socket.on('destroyPost', function(data) {
      switch (App.properties.get('currentPath')) {
      case "aPost":
        // FIXME: it's SO wrong to do transition from the object
        // App.router.transitionTo('posts')
        break
      case "root":
      case "posts":
      case "userTimeline":
      case "publicTimeline":
      case "userLikesTimeline":
      case "userCommentsTimeline":
        App.postsController.removePost('id', data.postId)
        break;
      case "searchPhrase":
        App.searchController.removePost('id', data.postId)
        break
      }
    })

    this.socket.on('newComment', function (data) {
      if (!isFirstPage())
        return

      var comment = App.Comment.create(data.comment)
      var post = findPost(data.comment.postId)

      if (post) {
        post.comments.pushObject(comment)
      } else {
        var post = App.postsController.findOne(data.comment.postId)
        App.postsController.addObject(post)
      }
    });

    this.socket.on('updateComment', function(data) {
      var post = findPost(data.comment.postId)

      var index = 0
      var comment = post.comments.find(function(comment) {
        index += 1
        if (comment && comment.id)
          return comment.id == data.comment.id
      })

      if (comment) {
        // FIXME: doesn't work as comment is not an Ember object
        // comment.set('body', data.comment.body)

        var updatedComment = App.Comment.create(data.comment)
        post.comments.removeObject(comment)
        post.comments.insertAt(index-1, updatedComment)
      }
    })

    this.socket.on('destroyComment', function(data) {
      var post = findPost(data.postId)
      var comment = post.comments.findProperty('id', data.commentId)
      post.comments.removeObject(comment)
    })

    this.socket.on('newLike', function(data) {
      if (!isFirstPage())
        return

      var user = App.User.create(data.user)
      var post = findPost(data.postId)

      if (post) {
        var like = post.likes.find(function(like) {
          return like.id == user.id
        })

        if (!like) {
          post.likes.pushObject(user)
        }
      } else {
        var post = App.postsController.findOne(data.postId)
        App.postsController.addObject(post)
      }
    })

    this.socket.on('removeLike', function(data) {
      var post = findPost(data.postId)

      if (post) {
        post.removeLike('id', data.userId)
      }
    })

    this.socket.on('disconnect', function(data) {
      that.reconnect();
    })
  },

  subscribe: function(channel, ids) {
    var subscribedTo = {};
    var that = this
    if (!$.isArray(ids)) {
      ids = [ids];
    }
    if (this.subscribedTo[channel]) {
      ids.forEach(function(id) {
        var indexOfThisId = that.subscribedTo[channel].indexOf(id);
        if (indexOfThisId == -1) {
          that.subscribedTo[channel].push(id);
        }
      })
    } else {
      this.subscribedTo[channel] = ids;
    }

    subscribedTo[channel] = ids;
    this.socket.emit('subscribe', subscribedTo);
  },

  unsubscribe: function(channel, ids) {
    var unsubscribedTo = {};
    var that = this;

    if (channel && ids) {
      if (this.subscribedTo[channel]) {
        if (!$.isArray(ids)) {
          ids = [ids];
        }
        ids.forEach(function(id) {
          var indexOfThisId = that.subscribedTo[channel].indexOf(id);
          if (indexOfThisId != -1) {
            unsubscribedTo[channel].push(id);
            that.subscribedTo[channel].splice(indexOfThisId, 1);
          }
        })
      }
    } else if(channel && !ids) {
      unsubscribedTo[channel] = this.subscribedTo[channel];
      delete this.subscribedTo[channel];
    } else if (!channel) {
      unsubscribedTo = this.subscribedTo;
    }

    this.socket.emit('unsubscribe', unsubscribedTo);
  },

  reconnect: function() {
    var subscribedTo = this.get('subscribedTo');
    this.unsubscribe();
    this.socket.emit('subscribe', subscribedTo);
  }
})

App.ApplicationView = Ember.View.extend(App.ShowSpinnerWhileRendering, {
  templateName: 'application',
});

App.ApplicationController = Ember.Controller.extend({
  subscription: null,

  currentPathDidChange: function() {
    App.properties.set('currentPath', this.get('currentPath'));
  }.observes('currentPath'),

  searchPhrase: function() {
    // TODO: valueBinding instead
    query = App.searchController.body

    if (/#/g.test(query))
      query = query.replace(/#/g, '%23')

    this.transitionToRoute('search', query)
  },

  init: function() {
    App.properties.set('subscription', App.Subscription.create())
    this._super()
  }
});

// Index view to display all posts on the page
App.SearchView = Ember.View.extend({
  templateName: 'search-list-view'
});

App.CreateSearchFieldView = Ember.TextField.extend(Ember.TargetActionSupport, {
    // TODO: Extract value from controller
    valueBinding: 'App.searchController.body',

    insertNewline: function() {
      this.triggerAction();
    }
})

// Index view to display all posts on the page
App.PostsView = Ember.View.extend({
  templateName: 'post-list-view',

  submitPost: function() {
    App.postsController.submitPost()
    // dirty way to restore original height of post textarea
    this.$().find('textarea').height('56px')
  }
});

// Create new post text field. Separate view to be able to bind events
App.CreatePostView = Ember.TextArea.extend(Ember.TargetActionSupport, {
  attributeBindings: ['class'],
  classNames: ['autogrow-short'],

  // TODO: Extract value from controller 
  valueBinding: 'App.postsController.body', 

  insertNewline: function() {
    this.triggerAction();
    // dirty way to restore original height of post textarea
    this.$().find('textarea').height('56px') 
  },

  didInsertElement: function() {
    // FIXME: bind as valueBinding property
    if (this._context)
      this.set('value', this._context.body)

    this.$().autogrow();
  }
})

App.JustStarted = Ember.View.extend({
  templateName: 'just-started',
  isAnonymousPermitted: isAnonymousPermitted,

  didInsertElement: function() {
    this.$().hide().slideDown();
  },

  // willDestroyElement: function() {
  //   var clone = this.$().clone();
  //   this.$().replaceWith(clone);
  //   clone.slideUp()
  // },

  justStarted: function() {
    return true
  }.property()
});

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
  isEditFormVisible: false,
  currentUser: currentUser,

  groupsNames: function() {
    if (!this.content.groups ||
        this.content.createdBy.username == this.content.groups.username ||
        (App.postsController.user &&
         App.postsController.user.username == this.content.groups.username))
      return null

    return this.content.groups.username
  }.property('this.content', 'App.postsController.user'),

  toggleVisibility: function() {
    this.toggleProperty('isFormVisible');
  },

  editFormVisibility: function() {
    this.toggleProperty('isEditFormVisible');
  },

  didInsertElement: function() {
    // wrap anchor tags around links in post text
    this.$().find('.text').anchorTextUrls();
    // wrap hashtags around text in post text
    this.$().find('.text').hashTagsUrls();
    // wrap search query around text in post text
    this.$().find('.text').highlightSearchResults(App.searchController.query);
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

    this.$().hide().slideDown('slow');
  },

  // FIXME: this leads to an emberjs error: "action is undefined"
  willDestroyElement: function() {
    if (this.$()) {
      var clone = this.$().clone();
      this.$().replaceWith(clone);
      clone.slideUp()
    }
  },

  showAllComments: function() {
    this.content.set('showAllComments', true)
  },

  unlikePost: function() {
    App.postsController.unlikePost(this.content.id)
  },

  destroyPost: function() {
    App.postsController.destroyPost(this.content.id)
  }
});

// View to display single post. Post has following subviews (defined below):
//  - link to show a comment form
//  - form to add a new comment
App.OwnPostContainerView = Ember.View.extend({
  templateName: 'own-post-view',
  isFormVisible: false,
  currentUser: currentUser,

  toggleVisibility: function() {
    this.toggleProperty('isFormVisible');
  },

  editFormVisibility: function() {
    this.toggleProperty('isEditFormVisible');
  },

  didInsertElement: function() {
    // wrap anchor tags around links in post text
    this.$().find('.text').anchorTextUrls();
    // wrap hashtags around text in post text
    this.$().find('.text').hashTagsUrls();
    // wrap search query around text in post text
    this.$().find('.text').highlightSearchResults(App.searchController.query);
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

    this.$().hide().slideDown('slow');
  },

  // willDestroyElement: function() {
  //   if (this.$()) {
  //     var clone = this.$().clone();
  //     this.$().replaceWith(clone);
  //     clone.slideUp()
  //   }
  // },

  showAllComments: function() {
    this.content.set('showAllComments', true)
  },

  unlikePost: function() {
    App.postsController.unlikePost(this.content.id)
  },

  destroyPost: function() {
    App.postsController.destroyPost(this.content.id)
  }
});

App.CommentContainerView = Ember.View.extend({
  templateName: 'comment-view',
  isEditFormVisible: false,

  editFormVisibility: function() {
    this.toggleProperty('isEditFormVisible');
  },

  didInsertElement: function() {
    // wrap anchor tags around links in comments
    this.$().find('.body').anchorTextUrls();
    // wrap hashtags around text in post text
    this.$().find('.body').hashTagsUrls();
    // wrap search query around text in post text
    this.$().find('.body').highlightSearchResults(App.searchController.query);
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

    this.$().hide().slideDown('fast');
  },

  // FIXME: this leads to an emberjs error: "action is undefined"
  willDestroyElement: function() {
    if (this.$()) {
      var clone = this.$().clone();
      this.$().replaceWith(clone);
      clone.slideUp()
    }
  },

  commentOwner: function() {
    return this.content.createdBy.id == currentUser &&
      this.content.createdBy.username != 'anonymous'
  }.property(),

  destroyComment: function() {
    App.commentsController.destroyComment(this.content.id)
  }
})

// Create new post text field. Separate view to be able to bind events
App.CommentPostView = Ember.View.extend(Ember.TargetActionSupport, {
  click: function() {
    this.triggerAction();
  },

  // XXX: this is a dup of App.PostContainerView.toggleVisibility()
  // function. I just do not know how to access it from UI bindings
  toggleVisibility: function() {
    this.toggleProperty('parentView.isFormVisible');
  }
})

App.LikePostView = Ember.View.extend(Ember.TargetActionSupport, {
  click: function() {
    this.triggerAction();
  },

  likePost: function() {
    // XXX: rather strange bit of code here -- potentially a defect
    var post = this._context
    App.postsController.likePost(post.id)
  }
})

App.LikeView = Ember.View.extend({
  templateName: 'like-view',
  tagName: 'li',
  classNameBindings: ['isLastAndNotSingle:last', 'isFirstAndSingle:first'],
  classNames: ['pull-left'],

  isFirstAndSingle: function() {
    // NOTE: this is a hacky way to get updated content index -- when
    // element is removed from the observed array content indexes are
    // not updated yet, hence latest index could be bigger than total
    // number of elements in the collection. Same workarround is
    // applied in isLastAndNotSingle function below.

    //var index = this.get('contentIndex')+1

    var currentId = this.get('content.id')
    var index, i = 0
    this.get('_parentView.content').forEach(function(like) {
      if (like.id == currentId) { index = i; return; }
      i += 1
    })
    var length = this.get('parentView.content.length')
    return index == 0 && length == 1
  }.property('parentView', 'parentView.content.@each'),

  isLastAndNotSingle: function() {
    var currentId = this.get('content.id')
    var index, i = 1
    this.get('_parentView.content').forEach(function(like) {
      if (like.id == currentId) { index = i; return; }
      i += 1
    })
    var length = this.get('parentView.content.length')

    return index == length && length > 1
  }.property('parentView', 'parentView.content.@each')
});

App.CommentPostViewSubst = Ember.View.extend(Ember.TargetActionSupport, {
  classNameBindings: 'isVisible visible:invisible',

  click: function() {
    this.triggerAction();
  },

  // XXX: this is a dup of App.PostContainerView.toggleVisibility()
  // function. I just do not know how to access it from UI bindings
  toggleVisibility: function() {
    this.toggleProperty('parentView.isFormVisible');
  },

  // this method does not observe post comments as a result it won't
  // display additional Add comment link if user does not refresh the page
  isVisible: function() {
    var post = this.get('parentView.content')
    var comments = post.comments || []

    if (comments.length < 4)
      return false

    // NOTE: though following approach is a nice once, FF implements
    // it differently -- just checks number of comments.

    // // return false if comments do not include current user
    // // var exist = post.createdBy.id == currentUser
    // var exist = false
    // comments.forEach(function(comment) {
    //   exist = exist || comment.createdBy.id == currentUser
    // })

    // // If user have not commented this post there is no need to
    // // display additional comment link at the bottom of the post.
    // if (!exist)
    //   return false

    return this.get('parentView.isFormVisible') == false;
  }.property('parentView.isFormVisible')
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
      this.$().hide().show();
      this.$('textarea').focus();
      this.$('textarea').trigger('keyup') // to apply autogrow
    }
  }.observes('parentView.isFormVisible'),

  submitComment: function() {
    if (this.body) {
      // XXX: rather strange bit of code here -- potentially a defect
      var post = this._context
      App.commentsController.createComment(post, this.body)
      this.set('parentView.isFormVisible', false)
      this.set('body', '')
    }
  },

  // XXX: this is a dup of App.PostContainerView.toggleVisibility()
  // function. I just do not know how to access it from UI bindings
  toggleVisibility: function() {
    this.toggleProperty('parentView.isFormVisible');
  },

  cancelComment: function() {
    this.set('parentView.isFormVisible', false)
    this.set('body', '')
  }
});

App.EditPostForm = Ember.View.extend({
  // I'd no success to use isVisibleBinding property...
  classNameBindings: 'isVisible visible:invisible',
  body: '',

  isVisible: function() {
    return this.get('parentView.isEditFormVisible') == true;
  }.property('parentView.isEditFormVisible'),

  autoFocus: function () {
    if (this.get('parentView.isEditFormVisible') == true) {
      this.$().hide().show();
      this.$('textarea').focus();
      this.$('textarea').trigger('keyup') // to apply autogrow
    }
  }.observes('parentView.isEditFormVisible'),

  updatePost: function() {
    if (this.body) {
      // XXX: rather strange bit of code here -- potentially a defect
      var post = this._context
      App.postsController.updatePost(post, this.body)
      this.set('parentView.isEditFormVisible', false)
    }
  },

  // XXX: this is a dup of App.PostContainerView.toggleVisibility()
  // function. I just do not know how to access it from UI bindings
  toggleVisibility: function() {
    this.toggleProperty('parentView.isEditFormVisible');
  }
});

App.EditCommentForm = Ember.View.extend({
  body: '',

  autoFocus: function () {
    if (this.get('parentView.isEditFormVisible') == true) {
      this.$().hide().show();
      this.$('textarea').focus();
      this.$('textarea').trigger('keyup') // to apply autogrow
    }
  }.observes('parentView.isEditFormVisible'),

  // FIXME: autoFocus doesn't observe isEditFormVisible?
  didInsertElement: function() {
    this.autoFocus()
  },

  updateComment: function() {
    if (this.body) {
      // XXX: rather strange bit of code here -- potentially a defect
      var comment = this._context
      App.commentsController.updateComment(comment, this.body)
      this.set('parentView.isEditFormVisible', false)
      this.set('body', '')
    }
  },

  // XXX: this is a dup of App.PostContainerView.toggleVisibility()
  // function. I just do not know how to access it from UI bindings
  editFormVisibility: function() {
    this.toggleProperty('parentView.isEditFormVisible');
  }
});


// Create new post text field. Separate view to be able to bind events
App.CreateCommentView = Ember.TextArea.extend(Ember.TargetActionSupport, {
  attributeBindings: ['class'],
  classNames: ['autogrow-short'],
  rows: 1,

  insertNewline: function() {
    this.triggerAction();
  },

  didInsertElement: function() {
    // FIXME: bind as valueBinding property
    if (this.action != 'submitComment')
      this.set('value', this._context.body)

    this.$().autogrow();
  }
})

// Separate page for a single post
App.OnePostController = Ember.ObjectController.extend();
App.onePostController = App.OnePostController.create()
App.OnePostView = Ember.View.extend({
  templateName: 'a-post',
  isFormVisible: false,
  isEditFormVisible: false,
  currentUser: currentUser,

  toggleVisibility: function() {
    this.toggleProperty('isFormVisible');
  },

  editFormVisibility: function() {
    this.toggleProperty('isEditFormVisible');
  },

  groupsNames: function() {
    if (!App.onePostController.content)
      return 

    if (!App.onePostController.content.groups ||
      App.onePostController.content.createdBy.username == App.onePostController.content.groups.username)
      return null

    return App.onePostController.content.groups.username
  }.property('App.onePostController.content', 'App.postsController.user'),

  didInsertElement: function() {
    if (this.$()) {
      // TODO: replace to boundhelpers
      // wrap anchor tags around links in comments
      this.$().find('.body').anchorTextUrls();
      // wrap hashtags around text in post text
      this.$().find('.body').hashTagsUrls();
    }
  },

  postLoaded: function() {
    // TODO: WTF! Replace to boundHelpers
    Ember.run.next(this, function() {
      if (this.$()) {
        this.$().find('.body').anchorTextUrls()
        this.$().find('.body').hashTagsUrls()
      }
    })
  }.observes('App.onePostController.content'),

  // XXX: kind of dup of App.PostContainerView.unlikePost function
  unlikePost: function() {
    App.postsController.unlikePost(App.onePostController.content.id)
  },

  postOwner: function() {
    return App.onePostController.content.createdBy && App.onePostController.content.createdBy.id == App.properties.userId
  }.property('App.onePostController.content'),

  destroyPost: function() {
    App.postsController.destroyPost(App.onePostController.content.id)
  }
});

App.UserTimelineController = Ember.ObjectController.extend({
  resourceUrl: '/v1/timeline',

  subscribeTo: function(timelineId) {
    $.ajax({
      url: this.resourceUrl + '/' + timelineId + '/subscribe',
      context: this,
      type: 'post',
      success: function(response) {
        if (App.postsController.user.type == 'group')
          App.groupsController.addObject(App.postsController.user.get('username'))

        this.transitionToRoute('posts')
      }
    })
  },

  unsubscribeTo: function(timelineId) {
    $.ajax({
      url: this.resourceUrl + '/' + timelineId + '/unsubscribe',
      context: this,
      type: 'post',
      success: function(response) {
        if (response.status == 'success') {
          App.groupsController.removeObject(App.postsController.user.get('username'))
          this.transitionToRoute('posts')
        }
      }
    })
  }
});
App.userTimelineController = App.UserTimelineController.create()

App.UserTimelineView = Ember.View.extend({
  templateName: 'user-timeline',
  currentUser: currentUser,

  showPostCreationForm: function() {
    return App.postsController.user &&
      (((App.postsController.user.type == 'user' || !App.postsController.user.type) && App.postsController.user.id == currentUser)
      || (App.postsController.user.type == 'group' && App.postsController.subscribers.filter(function(subscriber) { return subscriber.id == currentUser})))
  }.property('App.postsController.user'),

  isGroup: function() {
    return App.postsController.user && App.postsController.user.type == 'group'
  }.property('App.postsController.user'),

  subscribeTo: function() {
    App.userTimelineController.subscribeTo(App.postsController.id)
  },

  unsubscribeTo: function() {
    App.userTimelineController.unsubscribeTo(App.postsController.id)
  },

  submitPost: function() {
    App.postsController.set('receiveTimelinesIds', [ App.postsController.get('timelineId') ])
    App.postsController.submitPost()
    // dirty way to restore original height of post textarea
    this.$().find('textarea').height('56px')
  }
})

App.Comment = Ember.Object.extend({
  body: null,
  createdAt: null,
  user: null
});

App.Subscriber = Ember.Object.extend({
  id: null,
  username: null,
  isAdmin: null
})

App.User = Ember.Object.extend({
  id: null,
  username: null,
  createdAt: null,
  updatedAt: null,
  statistics: {},
  admins: [],
  type: null,

  subscriptionsLength: function() {
    if (!this.statistics || !this.statistics.subscriptions || this.statistics.subscriptions <= 0)
      return null

    return this.statistics.subscriptions
  }.property(),

  subscribersLength: function() {
    if (!this.statistics || !this.statistics.subscribers || this.statistics.subscribers <= 0)
      return null

    return this.statistics.subscribers
  }.property(),

  postsLength: function() {
    if (!this.statistics || !this.statistics.posts || this.statistics.posts <= 0)
      return null

    return this.statistics.posts
  }.property(),

  commentsLength: function() {
    if (!this.statistics || !this.statistics.discussions || this.statistics.discussions <= 0)
      return null

    return this.statistics.discussions
  }.property(),

  likesLength: function() {
    if (!this.statistics || !this.statistics.likes || this.statistics.likes <= 0)
      return null

    return this.statistics.likes
  }.property(),

  subscribedTo: function() {
    // TODO: review this code as this models *depends* on
    // postsController for misterious reasons
    if (!App.postsController.subscribers)
      return false

    var subscribed = App.postsController.subscribers.filter(function(subscriber) {
      return subscriber.id == App.properties.get('userId')
    })
    return subscribed.length > 0 ? true : false
  }.property(),

  ownProfile: function() {
    return App.postsController.user.id == currentUser
  }.property()
})

App.CommentsController = Ember.ArrayController.extend({
  resourceUrl: '/v1/comments',

  // XXX: noone uses this method
  removeComment: function(propName, value) {
    var obj = this.findProperty(propName, value);
    this.removeObject(obj);
  },

  destroyComment: function(commentId) {
    $.ajax({
      url: this.resourceUrl + '/' + commentId,
      type: 'post',
      data: {'_method': 'delete'},
      success: function(response) {
        console.log(response)
      }
    })
  },

  updateComment: function(comment, body) {
    $.ajax({
      url: this.resourceUrl + '/' + comment.id,
      type: 'post',
      data: { body: body, '_method': 'patch' },
      context: comment,
      success: function(response) {
        console.log(response)
      }
    })
  },

 createComment: function(post, body) {
    var comment = App.Comment.create({ 
      body: body,
      postId: post.id
    });
    
    $.ajax({
      url: this.resourceUrl,
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
  showAllComments: false,
  currentUser: currentUser,
  comments: Ember.ArrayProxy.create(),

  partial: function() {
    if (this.showAllComments)
      return false
    else
      return this.comments && this.get('comments').length > 3
  }.property('showAllComments', 'comments'),

  removeLike: function(propName, value) {
    var obj = this.get('likes').findProperty(propName, value);
    this.likes.removeObject(obj);
  },

  postOwner: function() {
    return this.get('createdBy').id == currentUser &&
      this.get('createdBy').username != 'anonymous'
  }.property('createdBy'),

  currentUserLiked: function() {
    var likes = this.get('likes')

    // XXX: we have just tried to render a view but have not recevied
    // anything from the server yet. Ideally we have to wait for this
    if (!likes) return;

    var found = false
    likes.forEach(function(like) {
      if (like.id == currentUser) {
        found = true
        return found;
      }
    })
    return found
  }.property('likes', 'likes.@each'),

  anyLikes: function() {
    var likes = this.get('likes')

    // XXX: we have just tried to render a view but have not recevied
    // anything from the server yet. Ideally we have to wait for this
    if (!likes) return;

    return likes.length > 0
  }.property('likes', 'likes.@each'),

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
  }.property('comments', 'comments.@each'),

  skippedCommentsLength: function() {
    return this.get('comments').length-2 // display first and last comments only
  }.property('comments', 'comments.@each'),

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

App.SearchController = Ember.ArrayController.extend(Ember.SortableMixin, App.SearchPaginationHelper, {
  resourceUrl: '/v1/search',
  body: '',
  content: [],
  sortProperties: ['updatedAt'],
  query: '',

  sortAscending: false,
  isLoaded: true,

  insertPostsIntoMediaList : function(posts) {
    App.properties.get('subscription').unsubscribe();

    App.searchController.set('content', []);
    var postIds = [];
    posts.forEach(function(attrs) {
      var post = App.Post.create(attrs);
      App.searchController.addObject(post);
      postIds.push(post.id)
    })

    App.properties.get('subscription').subscribe('post', postIds);
    App.searchController.set('isLoaded', true)
  },

  showPage: function(pageStart) {
    this.set('isLoaded', false)
    var query = this.get('query');
    if (/#/g.test(query))
      query = query.replace(/#/g, '%23')

    $.ajax({
      url: this.resourceUrl + '/' + query,
      type: 'get',
      data: { start: pageStart },
      success: function(response) {
        App.searchController.insertPostsIntoMediaList(response.posts);
      }
    });
  },

  searchByPhrase: function(searchQuery) {
    this.set('isLoaded', false)
    if (searchQuery) {
      if (/#/g.test(searchQuery))
        searchQuery = searchQuery.replace(/#/g, '%23')

      $.ajax({
        url: this.resourceUrl + '/' + searchQuery,
        type: 'get',
        success: function(response) {
          App.searchController.insertPostsIntoMediaList(response.posts);
        }
      });
      this.set('body', '');
    }
  },

  removePost: function(propName, value) {
    var obj = this.findProperty(propName, value);
    if (obj)
      this.removeObject(obj);
  },

  didRequestRange: function(pageStart) {
    App.searchController.showPage(pageStart)
  }
})
App.searchController = App.SearchController.create()

App.SubscriptionsController = Ember.ArrayController.extend({
  resourceUrl: '/v1/users',
  verb: 'subscriptions',

  findAll: function(username) {
    var filterSubscriptionsByUsername = function(subscriptions) {
      var filteredSubscriptions = []
      $.each(subscriptions, function(number, subscription) {
        if (subscription.name == 'Posts')
          filteredSubscriptions.push(subscription)
      })

      return filteredSubscriptions
    }

    this.set('isLoaded', false)

    $.ajax({
      url: this.resourceUrl + '/' + username + '/' + this.verb,
      dataType: 'jsonp',
      context: this,
      success: function(response) {
        App.properties.get('subscription').unsubscribe()

        this.set('content', filterSubscriptionsByUsername(response))
        this.set('username', username)

        this.set('isLoaded', true)
      }
    })
    return this
  }
})
App.subscriptionsController = App.SubscriptionsController.create()

App.SubscriptionsView = Ember.View.extend({
  templateName: 'subscriptions'
});

App.ErrorController = Ember.ArrayController.extend({

})
App.errorController = App.ErrorController.create()

App.ErrorView = Ember.View.extend({
  templateName: 'error-view'
});

App.SubscribersController = Ember.ArrayController.extend({
  resourceUrl: '/v1/users',
  verb: 'subscribers',
  showManagement: false,

  findAll: function(username) {
    this.set('isLoaded', false)

    $.ajax({
      url: this.resourceUrl + '/' + username + '/' + this.verb,
      dataType: 'jsonp',
      context: this,
      success: function(response) {
        App.properties.get('subscription').unsubscribe()

        this.set('content', [])
        response.subscribers.forEach(function(attrs) {
          if (response.admins)
            attrs.isAdmin = response.admins.indexOf(attrs.id) != -1

          var subscriber = App.Subscriber.create(attrs)
          this.addObject(subscriber)
        }, this)

        this.set('username', username)
        this.set('admins', response.admins)

        this.set('isLoaded', true)
      }
    })
    return this
  },

  removeSubscriber: function(event) {
    $.ajax({
      url: this.resourceUrl + '/' + this.get('username') + '/subscribers/' + event.context,
      dataType: 'jsonp',
      type: 'post',
      data: {'_method': 'delete'},
      context: this,
      success: function(response) {
        if (response.status == 'success') {
          var obj = this.findProperty('id', event.context);
          this.removeObject(obj);
        }
      }
    })

    return this
  },

  addAdmin: function(event) {
    $.ajax({
      url: this.resourceUrl + '/' + this.get('username') + '/subscribers/' + event.context + '/admin',
      dataType: 'jsonp',
      type: 'post',
      context: this,
      success: function(response) {
        if (response.status == 'success') {
          var obj = this.findProperty('id', event.context);
          if (obj)
            obj.set('isAdmin', true)
        }
      }
    })

    return this
  },

  removeAdmin: function(event) {
    $.ajax({
      url: this.resourceUrl + '/' + this.get('username') + '/subscribers/' + event.context + '/unadmin',
      dataType: 'jsonp',
      type: 'post',
      context: this,
      success: function(response) {
        if (response.status == 'success') {
          var obj = this.findProperty('id', event.context);
          if (obj)
            obj.set('isAdmin', false)
        }
      }
    })

    return this
  }
})
App.subscribersController = App.SubscribersController.create()

App.SubscribersView = Ember.View.extend({
  templateName: 'subscribers',

  browseSubscribers: function() {
    // FIXME: this should be a route, not an action!
    // App.router.transitionTo('subscribers', App.subscribersController.get('username'))
  },

  manageSubscribers: function() {
    // FIXME: this should be a route, not an action!
    // App.router.transitionTo('showManagement', App.subscribersController.get('username'))
  },

  isOwner: function() {
    return App.subscribersController.username  == App.properties.username || App.subscribersController.admins && App.subscribersController.admins.indexOf(currentUser) != -1
  }.property('App.subscribersController.username', 'App.properties.username'),

  hasAdmins: function() {
    return App.subscribersController.admins !== undefined
  }.property('App.subscribersController.admins'),

  showManagement: function() {
    return App.subscribersController.showManagement
  }.property('App.subscribersController.showManagement')
});

App.TopController = Ember.ArrayController.extend({
  resourceUrl: '/v1/top',

  getTop: function(category) {
    this.set('isLoaded', false)

    $.ajax({
      url: this.resourceUrl + '/' + category,
      dataType: 'jsonp',
      context: this,
      success: function(response) {
        App.properties.get('subscription').unsubscribe()

        this.set('content', response)
        this.set('category', category)

        this.set('isLoaded', true)
      }
    })
    return this
  }
})
App.topController = App.TopController.create()

App.TopView = Ember.View.extend({
  templateName: 'top-view'
});

App.SignupController = Ember.ObjectController.extend({
  resourceUrl: '/v1/signup',
  username: '',
  password: '',

  signup: function() {
    $.ajax({
      url: this.resourceUrl,
      data: { username: this.get('username'), password: this.get('password') },
      dataType: 'jsonp',
      type: 'post',
      context: this,
      success: function(response) {
        switch (response.status) {
        case 'success' :
          App.properties.set('isAuthorized', true)
          App.properties.set('username', response.user.username)
          App.properties.set('userId', response.user.id)
          this.transitionToRoute('posts')
          break
        case 'fail' :
          this.transitionToRoute('signup')
          break
        }
      }
    })
    return this
  }
})
App.signupController = App.SignupController.create()

App.SignupView = Ember.View.extend({
  templateName: 'signup-view',

  insertNewline: function() {
    this.triggerAction();
  },

  signup: function() {
    App.signupController.signup()
  }
});

App.SigninController = Ember.ObjectController.extend({
  resourceUrl: '/v1/session',
  username: '',
  password: '',

  signin: function() {
    var that = this;
    
    $.ajax({
      url: this.resourceUrl,
      data: { username: this.get('username'), password: this.get('password') },
      dataType: 'jsonp',
      type: 'post',
      context: this,
      success: function(response) {
        switch (response.status) {
        case 'success':
          App.properties.set('isAuthorized', true)
          App.properties.set('username', response.user.username)
          App.properties.set('userId', response.user.id)
          App.groupsController.loadGroups()
          this.transitionToRoute('posts')
          break
        case 'fail':
          that.transitionToRoute('signin')
          break
        }
      }
    })
    return this
  }
})
//App.signinController = App.SigninController.create()

App.SigninView = Ember.View.extend({
  templateName: 'signin-view',

  insertNewline: function() {
    this.triggerAction();
  }
});

App.GroupCreationController = Ember.ArrayController.extend({
})
App.groupCreationController = App.GroupCreationController.create()

App.GroupCreationView = Ember.View.extend({
  templateName: 'create-group-view',

  insertNewline: function() {
    this.triggerAction();
  }
});

App.PostsController = Ember.ArrayController.extend(Ember.SortableMixin, App.PaginationHelper, {
  resourceUrl: '/v1/posts',
  timelineId: null,
  content: [],
  body: '',
  isProgressBarHidden: 'hidden',
  receiveTimelinesIds: [],

  sortProperties: ['updatedAt'],
  sortAscending: false,
  isLoaded: true,

  // XXX: a bit strange having this method here?
  submitPost: function() {
    if (this.body) {
      App.postsController.createPost(this.body);
      this.set('body', '')
      this.set('receiveTimelinesIds', [])
    }
  },

  removePost: function(propName, value) {
    var obj = this.findProperty(propName, value);
    if (obj)
      this.removeObject(obj);
  },

  // TODO: like model
  likePost: function(postId) {
    $.ajax({
      url: this.resourceUrl + '/' + postId + '/like',
      type: 'post',
      success: function(response) {
        console.log(response)
      }
    })
  },

  // TODO: like model
  unlikePost: function(postId) {
    $.ajax({
      url: this.resourceUrl + '/' + postId + '/unlike',
      type: 'post',
      success: function(response) {
        console.log(response)
      }
    })
  },

  destroyPost: function(postId) {
    $.ajax({
      url: this.resourceUrl + '/' + postId,
      type: 'post',
      data: {'_method': 'delete'},
      success: function(response) {
        console.log(response)
      }
    })
  },

  updatePost: function(post, body) {
    $.ajax({
      url: this.resourceUrl + '/' + post.id,
      type: 'post',
      data: { body: body, '_method': 'patch' },
      context: post,
      success: function(response) {
        console.log(response)
      }
    })
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
    data.append('timelinesIds', App.postsController.get('receiveTimelinesIds').toString()) // XXX: dirty!

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

    xhr.open("post", this.resourceUrl);
    xhr.send(data);

    // fallback to simple ajax if xhr is not supported
    // $.ajax({
    //   url: this.resourceUrl,
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

  didRequestRange: function(pageStart) {
    App.postsController.findAll(pageStart)
  },

  didTimelineChange: function() {
    // NOTE: this method might be called even when we have not
    // initialized subscription property
    if (App.properties.get('subscription'))
      App.properties.get('subscription').unsubscribe()

    this.resetPage()
  }.observes('timeline'),

  findAll: function(pageStart, suffix) {
    this.set('isLoaded', false)

    var timeline = this.get('timeline') || ""

    if (suffix)
      suffix = '/' + suffix
    else
      suffix = ''

    $.ajax({
      url: '/v1/timeline/' + timeline + suffix,
      data: { start: pageStart },
      dataType: 'jsonp',
      context: this,
      success: function(response) {
        // TODO: extract to an observer
        if (response.user) {
          this.set('user', App.User.create(response.user))
          this.set('timeline', response.user.username)
        }

        App.properties.get('subscription').unsubscribe()
        App.properties.get('subscription').subscribe('timeline', response.id)

        this.set('content', [])
        this.set('id', response.id)
        this.set('timelineId', response.id)

        if (response.posts)
          response.posts.forEach(function(attrs) {
            var post = App.Post.create(attrs)
            this.addObject(post)
          }, this)

        if (response.subscribers)  this.set('subscribers', response.subscribers)

        this.set('isLoaded', true)
      }
    })
    return this
  },

  findOne: function(postId) {
    var that = this
    var post = App.Post.create({
      id: postId
    });

    $.ajax({
      url: this.resourceUrl + '/' + postId,
      dataType: 'jsonp',
      context: post,
      success: function(response) {
        if (App.properties.get('currentPath') == 'aPost') {
          // TODO: we are not unsubscribing from all posts since we add
          // posts to content by this method if it's missing on a page
          App.properties.get('subscription').unsubscribe()
          App.properties.get('subscription').subscribe('post', response.id)
        }
        this.setProperties(response)
        App.onePostController.set('content', response)
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        if (errorThrown == 'Not Found')
          that.transitionToRoute('error')
      }
    })
    return post;
  }
})
App.postsController = App.PostsController.create()

App.PostsRoute = Ember.Route.extend({
  model: function() {
    // TODO: findAll method to accept timeline parameter
    App.postsController.set('timeline', null)
    return App.postsController.findAll()
  }
})

App.PostRoute = Ember.Route.extend({
  model: function(params) {
    // TODO: move findOne to model and make it like this
    // App.Post.find(params_post_id) then we are good to delete this method
    return App.postsController.findOne(params.post_id);
  },

  setupController: function(controller, model) {
    // TODO: one we migrate onePostController to postController we are
    // good to drop this method
    this.controllerFor('onePost').set('content', model);
  },

  renderTemplate: function() {
    // TODO: one we migrate onePostController to postController AND
    // rename a-post view to post we can drop this method
    this.render('a-post', {
      controller: this.controllerFor('onePost')
    })
  }
})

App.PublicRoute = Ember.Route.extend({
  model: function() {
    // TODO: findAll method to accept timeline parameter
    App.postsController.set('timeline', 'everyone')
    return App.postsController.findAll()
  },

  renderTemplate: function() {
    this.render('posts')
  }
})

App.GroupsRoute = Ember.Route.extend({
  renderTemplate: function() {
    this.render('create-group-view', {
      controller: 'groups'
    })
  }
})

App.UserRoute = Ember.Route.extend({
  model: function() {
    return App.postsController.findAll()
  },

  setupController: function(controller, model) {
    this.controllerFor('posts').set('content', model);
  },

  renderTemplate: function() {
    this.render('user-timeline', {
      controller: this.controllerFor('posts')
    })
  }
})

App.LikesRoute = Ember.Route.extend({
  model: function() {
    return App.postsController.findAll(0, 'likes')
  },

  setupController: function(controller, model) {
    this.controllerFor('posts').set('content', model);
  },

  renderTemplate: function() {
    this.render('user-timeline', {
      controller: this.controllerFor('posts')
    })
  }
})

App.CommentsRoute = Ember.Route.extend({
  model: function() {
    return App.postsController.findAll(0, 'comments')
  },

  setupController: function(controller, model) {
    this.controllerFor('posts').set('content', model);
  },

  renderTemplate: function() {
    this.render('user-timeline', {
      controller: this.controllerFor('posts')
    })
  }
})

App.SubscribersRoute = Ember.Route.extend({
  model: function(username) {
    return App.subscribersController.findAll(username)
  }
})

App.SubscriptionsRoute = Ember.Route.extend({
  model: function(username) {
    return App.subscriptionsController.findAll(username)
  }
})

App.SearchRoute = Ember.Route.extend({
  model: function(params) {
    // TODO: extract these side effects below to a controller or
    // something
    var query = params.query

    if (/%23/g.test(query))
      query = query.replace(/%23/g, '#')

    query = decodeURIComponent(query)

    App.searchController.set('body', query)
    App.searchController.set('query', query)
    App.postsController.set('user', null)

    return App.searchController.searchByPhrase(query)
  },

  renderTemplate: function() {
    this.render('search-list-view')
  }
})

App.Router.map(function() {
  this.resource('search', { path: "/search/:query" })

  this.resource('public', { path: "/public" })
  this.resource('posts', { path: "/" })
  this.resource('post', { path: "/posts/:post_id" })

  this.resource('user', { path: "/users/:username" })
  this.resource('subscribers', { path: "/users/:username/subscribers" })
  this.resource('manage', { path: "/users/:username/subscribers/manage" }) // TODO
  this.resource('subscriptions', { path: "/users/:username/subscriptions" })
  this.resource('likes', { path: "/users/:username/likes" })
  this.resource('comments', { path: "/users/:username/comments" })

  this.resource('groups', { path: "/groups" })

  this.resource('signup', { path: "/signup" })
  this.resource('signin', { path: "/signin" })

  this.resource('stats', { path: "/top/:category" }) // TODO

  this.resource('error', { path: "/error" }) // TODO
})

App.Router.reopen({
  location: 'history'
})
