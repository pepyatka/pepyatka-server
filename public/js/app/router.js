define(["app/app",
        "controllers/CometController"], function(App) {
  App.SettingsRoute = Ember.Route.extend({
    model: function() {
      return App.User.find(App.properties.get('userId'))
    },

    setupController: function(controller, model) {
      controller.set('content', model)
    },

    renderTemplate: function() {
      this.render('settings')
    }
  })

  App.HomeRoute = Ember.Route.extend({
    deactivate: function() {
      this.controllerFor('comet').unsubscribe()
    },

    model: function() {
      return App.Timeline.find()
    },

    setupController: function(controller, model) {
      var groups = App.Group.findAll()
      this.controllerFor('groups').set('content', groups)
      this.controllerFor('tags').set('content', App.Tag.findAll())
      this.controllerFor('timeline').set('content', model)
      this.controllerFor('timeline').set('groups', groups)

      this.controllerFor('comet').set('channel', model)
    },

    renderTemplate: function() {
      this.render('timeline')
    }
  })

  App.PostRoute = Ember.Route.extend({
    deactivate: function() {
      this.controllerFor('comet').unsubscribe()
    },

    model: function(params) {
      return App.Post.find(params.post_id)
    },

    setupController: function(controller, model) {
      this.controllerFor('groups').set('content', App.Group.findAll())
      this.controllerFor('tags').set('content', App.Tag.findAll())
      controller.set('content', model);

      this.controllerFor('comet').set('channel', model)
    }
  })

  App.PublicRoute = Ember.Route.extend({
    deactivate: function() {
      this.controllerFor('comet').unsubscribe()
    },

    model: function() {
      return App.Timeline.find('everyone')
    },

    setupController: function(controller, model) {
      this.controllerFor('groups').set('content', App.Group.findAll())
      this.controllerFor('tags').set('content', App.Tag.findAll())
      this.controllerFor('timeline').set('content', model)

      this.controllerFor('comet').set('channel', model)
    },

    renderTemplate: function() {
      this.render('timeline')
    }
  })

  App.GroupsRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      this.controllerFor('groups').set('content', App.Group.findAll())
      this.controllerFor('tags').set('content', App.Tag.findAll())
    },

    renderTemplate: function() {
      this.render('create-group', {
        controller: 'groups'
      })
    }
  })

  // TODO: actually this route doesn't render a user profile, but its
  // posts instead, sounds like a wrong design and better'd be to use
  // PostsRoute instead
  App.UserRoute = Ember.Route.extend({
    deactivate: function() {
      this.controllerFor('comet').unsubscribe()
    },

    model: function(params) {
      return params.username
    },

    setupController: function(controller, model) {
      this.controllerFor('groups').set('content', App.Group.findAll())
      this.controllerFor('tags').set('content', App.Tag.findAll())

      var timeline = App.Timeline.find(model)
      this.controllerFor('timeline').set('content', timeline);
      this.controllerFor('comet').set('channel', timeline)
    },

    renderTemplate: function() {
      this.render('user-timeline', {
        controller: this.controllerFor('timeline')
      })
    }
  })

  App.LikesRoute = Ember.Route.extend({
    deactivate: function() {
      this.controllerFor('comet').unsubscribe()
    },

    model: function(params) {
      return params.username + '/likes'
    },

    setupController: function(controller, model) {
      this.controllerFor('groups').set('content', App.Group.findAll())
      this.controllerFor('tags').set('content', App.Tag.findAll())

      var timeline = App.Timeline.find(model)
      this.controllerFor('timeline').set('content', timeline);
      this.controllerFor('comet').set('channel', timeline)
    },

    renderTemplate: function() {
      this.render('user-timeline', {
        controller: this.controllerFor('timeline')
      })
    }
  })

  App.CommentsRoute = Ember.Route.extend({
    deactivate: function() {
      this.controllerFor('comet').unsubscribe()
    },

    model: function(params) {
      return params.username + '/comments'
    },

    setupController: function(controller, model) {
      this.controllerFor('groups').set('content', App.Group.findAll())
      this.controllerFor('tags').set('content', App.Tag.findAll())

      var timeline = App.Timeline.find(model)
      this.controllerFor('timeline').set('content', timeline);
      this.controllerFor('comet').set('channel', timeline)
    },

    renderTemplate: function() {
      this.render('user-timeline', {
        controller: this.controllerFor('timeline')
      })
    }
  })

  App.FeedSubscribersRoute = Ember.Route.extend({
    model: function(params) {
      return params.username
    },

    setupController: function(controller, model) {
      this.controllerFor('subscribers').set('content', App.Group.findAllSubscribers(model));
    },

    renderTemplate: function() {
      this.render('subscribers', {
        controller: this.controllerFor('subscribers')
      })
    }
  })

  App.ManageSubscribersRoute = Ember.Route.extend({
    model: function(params) {
      return params.username
    },

    setupController: function(controller, model) {
      this.controllerFor('subscribers').set('content', App.Group.findAllSubscribers(model));
    },

    renderTemplate: function() {
      this.render('subscribers', {
        controller: this.controllerFor('subscribers')
      })
    }
  })

  App.FeedSubscriptionsRoute = Ember.Route.extend({
    model: function(params) {
      return params.username
    },

    setupController: function(controller, model) {
      if (typeof model !== 'string') model = model.username

      controller.set('content', App.Group.findAllWithUsers());
    },

    renderTemplate: function() {
      this.render('subscriptions');
    }
  })

  App.SearchRoute = Ember.Route.extend({
    deactivate: function() {
      this.controllerFor('comet').unsubscribe()
    },

    model: function(params) {
      return params.query
    },

    setupController: function(controller, model) {
      var posts = this.controllerFor('search').search(decodeURIComponent(model))

      this.controllerFor('search').set('content', posts);
      this.controllerFor('groups').set('content', App.Group.findAll())
      this.controllerFor('tags').set('content', App.Tag.findAll())

      this.controllerFor('comet').set('channel', posts)
    },

    renderTemplate: function() {
      this.render('search')
    }
  })

  App.ErrorRoute = Ember.Route.extend({
  })

  App.StatsRoute = Ember.Route.extend({
    model: function(params) {
      return {category: params.category}
    },

    setupController: function(controller, model) {
      controller.set('content', App.Top.findAll(model.category));
    },

    renderTemplate: function() {
      this.render('top');
    }
  })

  App.AboutRoute = Ember.Route.extend({
    setupController: function(controller, model) {
      this.controllerFor('groups').set('content', App.Group.findAll())
      this.controllerFor('tags').set('content', App.Tag.findAll())
    },
  })

  App.Router.map(function() {
    this.resource('search', { path: "/search/:query" })

    this.resource('public', { path: "/public" })
    // NOTE: rather weird name for a river of news route
    this.resource('home', { path: "/" })
    this.resource('settings', { path: "/settings" })
    this.resource('post', { path: "/posts/:post_id" })

    this.resource('user', { path: "/users/:username" })
    this.resource('feedSubscribers', { path: "/users/:username/subscribers" })
    this.resource('manageSubscribers', { path: "/users/:username/subscribers/manage" }) // TODO
    this.resource('feedSubscriptions', { path: "/users/:username/subscriptions" })
    this.resource('likes', { path: "/users/:username/likes" })
    this.resource('comments', { path: "/users/:username/comments" })

    this.resource('groups', { path: "/groups" })

    this.resource('signup', { path: "/signup" })
    this.resource('signin', { path: "/signin" })

    this.resource('stats', { path: "/top/:category" })

    this.resource('error', { path: "/error" })
    this.resource('about', { path: "/about" })
  });

  (function() {
    var get = Ember.get, set = Ember.set;
    var popstateFired = false;
    Ember.HistoryJsLocation = Ember.Object.extend({
      init: function() {
        set(this, 'location', get(this, 'location') || window.location);
        this._initialUrl = this.getURL();
        this.initState();
      },
      initState: function() {
        this.replaceState(this.formatURL(this.getURL()));
        set(this, 'history', window.History);
      },
      rootURL: '/',
      getURL: function() {
        var rootURL = get(this, 'rootURL'),
        url = get(this, 'location').pathname;
        rootURL = rootURL.replace(/\/$/, '');
        url = url.replace(rootURL, '');
        return url;
      },
      setURL: function(path) {
        path = this.formatURL(path);
        if (this.getState() && this.getState().path !== path) {
          this.pushState(path);
        }
      },
      replaceURL: function(path) {
        path = this.formatURL(path);
        if (this.getState() && this.getState().path !== path) {
          this.replaceState(path);
        }
      },
      getState: function() {
        return get(this, 'history').getState().data;
      },
      pushState: function(path) {
        History.pushState({ path: path }, null, path);
      },
      replaceState: function(path) {
        History.replaceState({ path: path }, null, path);
      },
      onUpdateURL: function(callback) {
        var guid = Ember.guidFor(this),
        self = this;
        Ember.$(window).bind('popstate.ember-location-'+guid, function(e) {
          if(!popstateFired) {
            popstateFired = true;
            if (self.getURL() === self._initialUrl) { return; }
          }
          callback(self.getURL());
        });
      },
      formatURL: function(url) {
        var rootURL = get(this, 'rootURL');
        if (url !== '') {
          rootURL = rootURL.replace(/\/$/, '');
        }
        return rootURL + url;
      },
      willDestroy: function() {
        var guid = Ember.guidFor(this);
        Ember.$(window).unbind('popstate.ember-location-'+guid);
      }
    });
    Ember.Location.registerImplementation('historyJs', Ember.HistoryJsLocation);
  })();

  // jQuery 1.9.x removes msie method - temp enables this
  jQuery.browser={};(function(){jQuery.browser.msie=false;
                         jQuery.browser.version=0;if(navigator.userAgent.match(/MSIE ([0-9]+)\./)){
                           jQuery.browser.msie=true;jQuery.browser.version=RegExp.$1;}})();

  // NOTE: history.js (particularly replaceState method) replaces
  // encoded URLs like %23 to # which break search by tag functionality.
  App.Router.reopen({
    location: $.browser && $.browser.msie ? 'historyJs' : 'history'
  });
});
