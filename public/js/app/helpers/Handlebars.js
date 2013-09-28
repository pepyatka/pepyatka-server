define(["app/app", "ember"], function(App, Ember) {
  Ember.Handlebars.registerBoundHelper('decodeURIComponent', function(content) {
    return decodeURIComponent(content)
  })

  Ember.Handlebars.registerBoundHelper("maybeSep", function(content, options) {
    var list = options.hash.list;
    var sep  = options.hash.sep;

    if (list.indexOf(content) == list.length - 1) return "";

    return sep;
  });

  Ember.Handlebars.registerBoundHelper("formatGroupName", function(content, options) {
    var post = options.hash.post;

    if (content == post.get("createdBy.username")){
      return post.get("createdBy.info.screenName").split(" ")[0] + "'s feed";
    }

    return content;
  });

  Ember.Handlebars.registerBoundHelper('prettifyText', function(content) {
    var text = $('<span/>').text(content)

    // wrap anchor tags around links in post text
    text.anchorTextUrls()
    // wrap hashtags around text in post text
    text.hashTagsUrls();
    // wrap search query around text in post text
    if (App.properties.get('searchQuery'))
      text.highlightSearchResults(App.properties.get('searchQuery'));
    // please read https://github.com/kswedberg/jquery-expander/issues/24
    // text.expander({
    //   slicePoint: 350,
    //   expandPrefix: '&hellip; ',
    //   preserveWords: true,
    //   expandText: 'more&hellip;',
    //   userCollapseText: '',
    //   collapseTimer: 0,
    //   expandEffect: 'fadeIn',
    //   collapseEffect: 'fadeOut'
    // })

    return new Handlebars.SafeString(text.html())
  })

  Ember.Handlebars.registerBoundHelper('ifpositive', function(property, options) {
    var context = (options.contexts && options.contexts[0]) || this;
    var val = Ember.get(context, property)
    if (val > 0)
      return options.fn(this);
    return options.inverse(this);
  })
});
