define(["app/app",
        "ember"], function(App, Ember) {
  Ember.subscribe('render', {
    before: function(name, start, payload){
      return start
    },
    after: function(name, end, payload, start){
      var duration = Math.round(end - start)
      var template = payload.template
      if (template){ // this is to filter out anonymous templates
        console.log('rendered', template, 'took', duration, 'ms')
      }
    }
  })
});
