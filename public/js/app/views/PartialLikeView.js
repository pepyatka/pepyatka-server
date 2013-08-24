define(["app/app",
        "text!templates/_likeTemplate.handlebars"], function(App, tpl) {
  App.PartialLike = Ember.View.extend({
    templateName: '_like',
    template: Ember.Handlebars.compile(tpl),

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
      return index === 0 && length === 1
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
});
