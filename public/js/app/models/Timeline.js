define(["app/app"], function(App) {
  App.Timeline = Ember.Object.extend({
    posts: Ember.ArrayProxy.extend(Ember.SortableMixin, {
      // TODO: figure out why we have to add itemController="post"
      // option to each iterator in the view
      itemController: 'post',

      content: [],

      sortProperties: ['updatedAt'],
      sortAscending: false
    })
  })

  App.Timeline.reopenClass({
    resourceUrl: '/v1/timeline',

    find: function(timelineId, options) {
      if (timelineId === undefined) timelineId = ''

      var timeline = App.Timeline.create()
      var pageStart = options && options.offset || 0
      var pageSize  = options && options.limit || 25

      $.ajax({
        url: this.resourceUrl + '/' + timelineId || '',
        data: { offset: pageStart, limit: pageSize },
        dataType: 'jsonp',
        context: this
      }).then(function(response) {
        if (response.posts) {
          // TODO: why we have to define this here even we have defined
          // posts property in Timeline object?
          timeline.set('posts', Ember.ArrayProxy.createWithMixins(Ember.SortableMixin, {
            // TODO: figure out why we have to add itemController="post"
            // option to each iterator in the view
            itemController: 'post',

            content: [],

            sortProperties: ['updatedAt'],
            sortAscending: false
          }))

          var _posts = []

          response.posts.forEach(function(attrs) {
            var comments = attrs.comments
            delete attrs.comments

            var post = App.Post.create(attrs)
            post.comments = Ember.ArrayProxy.createWithMixins(Ember.SortableMixin, {
              // TODO: figure out why we have to add itemController="comment"
              // option to each iterator in the view
              itemController: 'comment',

              content: []
            })

            if (comments) {
              comments.forEach(function(attrs) {
                var comment = App.Comment.create(attrs)
                post.comments.addObject(comment)
              })
            }

            _posts.push(post)
          })

          timeline.posts.addObjects(_posts)
          delete response.posts
        }

        timeline.setProperties(response)
      })

      // FIXME: I do believe this is a temp solution until I fix
      // pagination to play nicely with the rest of the app
      timeline.set('timelineId', timelineId)

      return timeline
    },

    subscribeTo: function(timelineId, options) {
      $.ajax({
        url: this.resourceUrl + '/' + timelineId + '/subscribe',
        context: this,
        type: 'post',
        data: { '_csrf': csrf_token },
        success: options && options.success ? options.success : null
      });
    },

    unsubscribeTo: function(timelineId, options) {
      $.ajax({
        url: this.resourceUrl + '/' + timelineId + '/unsubscribe',
        context: this,
        type: 'post',
        data: { '_csrf': csrf_token },
        success: options && options.success ? options.success : null
      });
    }
  })

});
