define(["app/app", "socket.io"], function(App) {
  App.CometController = Ember.Controller.extend({
    needs: ['timeline', 'search', 'post'],

    subscribedTo: {},

    // TODO: review this method -- hacky solution
    currentController: function() {
      switch (App.properties.get('currentPath')) {
      case 'home':
      case 'user':
      case 'comments':
      case 'likes':
      case 'public':
        return this.get('controllers.timeline')
      case 'search':
        return this.get('controllers.search')
      case 'post':
        return this.get('controllers.post')
      }
    },

    findPost: function(postId) {
      var currentController = this.currentController()
      if (currentController.constructor === App.PostController)
        return currentController.get('content')
      else
        return currentController.get('content.posts').find(function(post) {
          return post.id === postId
        })
    },

    isFirstPage: function() {
      var pageStart = this.currentController().get('pageStart')
      return pageStart === 0 ||
        pageStart === undefined
    },

    newPost: function(data) {
      if (!this.isFirstPage())
        return

      var post = App.Post.createFromProto(data.post)     
      this.currentController().get('posts').addObject(post)
    },

    updatePost: function(data) {
      var post = this.findPost(data.post.id)

      if (post)
        post.set('body', data.post.body)
    },

    destroyPost: function(data) {
      var post = this.findPost(data.postId)
      this.currentController().get('content.posts').removeObject(post)
    },

    newComment: function(data) {
      if (!this.isFirstPage())
        return

      var comment = App.Comment.create(data.comment)
      var post = this.findPost(data.comment.postId)

      if (post) {
        post.comments.pushObject(comment)
      } else {
        post = App.Post.find(data.comment.postId)
        this.currentController().get('posts').addObject(post)
      }
    },

    updateComment: function(data) {
      var post = this.findPost(data.comment.postId)

      var index = 0
      var comment = post.comments.find(function(comment) {
        index += 1
        if (comment && comment.id)
          return comment.id === data.comment.id
      })

      if (comment) {
        // FIXME: doesn't work as comment is not an Ember object
        // comment.set('body', data.comment.body)

        var updatedComment = App.Comment.create(data.comment)
        post.comments.removeObject(comment)
        post.comments.insertAt(index-1, updatedComment)
      }
    },

    destroyComment: function(data) {
      var post = this.findPost(data.postId)

      var comment = post.comments.findProperty('id', data.commentId)
      post.comments.removeObject(comment)
    },

    newLike: function(data) {
      if (!this.isFirstPage())
        return

      var user = App.User.create(data.user)
      var post = this.findPost(data.postId)

      if (post) {
        var like = post.likes.find(function(like) {
          return like.id == user.id
        })

        if (!like)
          post.likes.pushObject(user)
      } else {
        post = App.Post.find(data.postId)
        this.currentController().get('posts').addObject(post)
      }
    },

    removeLike: function(data) {
      var post = this.findPost(data.postId)

      if (post) {
        var like = post.get('likes').findProperty('id', data.userId)
        post.get('likes').removeObject(like)
      }
    },

    disconnect: function(data) {
      this.reconnect();
    },

    init: function() {
      this._super();

      this.set('socket', io.connect('/'));

      this.get('socket').on('newPost', this.newPost.bind(this));
      this.get('socket').on('updatePost', this.updatePost.bind(this));
      this.get('socket').on('destroyPost', this.destroyPost.bind(this));

      this.get('socket').on('newComment', this.newComment.bind(this));
      this.get('socket').on('updateComment', this.updateComment.bind(this));
      this.get('socket').on('destroyComment', this.destroyComment.bind(this));

      this.get('socket').on('newLike', this.newLike.bind(this));
      this.get('socket').on('removeLike', this.removeLike.bind(this));

      this.get('socket').on('disconnect', this.disconnect.bind(this));
    },

    monitor: function() {
      var channel = this.get('channel')
      if (channel.constructor === App.Timeline)
        this.subscribe('timeline', channel.get('id'))
      else if (channel.constructor === App.Post)
        this.subscribe('post', channel.get('id'))
      else if (channel.constructor === Ember.ArrayProxy) {
        channel.get('content').forEach(function(post) {
          this.subscribe('post', post.get('id'))
        }, this)}
    }.observes('channel.id', 'channel.content.length'),

    subscribe: function(channel, ids) {
      if (!ids) return;

      var subscribedTo = {};
      var that = this
      if (!$.isArray(ids))
        ids = [ids];

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
      this.get('socket').emit('subscribe', subscribedTo);
    }
  })
});
