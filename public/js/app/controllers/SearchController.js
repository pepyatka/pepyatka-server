define(["app/app",
        "ember",
        "app/helpers/Components"], function(App, Ember) {
  App.SearchController = Ember.ObjectController.extend(App.PaginationHelper, {
    resourceUrl: '/v1/search',

    actions: {
      search: function(query, options) {
        var posts = Ember.ArrayProxy.createWithMixins(Ember.SortableMixin, {
          // TODO: figure out why we have to add itemController="post"
          // option to each iterator in the view
          itemController: 'post',

          content: [],

          sortProperties: ['updatedAt'],
          sortAscending: false
        })

        var pageStart = options && options.offset || 0
        var pageSize  = options && options.limit || 25

        $.ajax({
          // TODO: temporary hardcode resource url into query
          url: '/v1/search' + '/' + encodeURIComponent(query),
          type: 'get',
          data: { offset: pageStart, limit: pageSize },
          context: this,
        }).then(function(response) {
          if (response.posts)
            var _posts = []

          response.posts.forEach(function(attrs) {
            var post = App.Post.createFromProto(attrs)
            _posts.push(post)
          })

          posts.addObjects(_posts)
        })

        this.query = query

        return posts
      }
    },

    didRequestRange: function(options) {
      var posts = this.search(this.get('query'), { offset: options.offset || 0 })

      this.set('content', posts)
    }

  })
});
