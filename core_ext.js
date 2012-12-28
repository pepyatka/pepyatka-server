var _ = require('underscore')

Array.prototype.forEachAsync = function(query, action, after) {
  var len = this.length
  var done = 0
  var i = 0
  
  if (len > 0) {
    _.each(this, function(item) {
      query(item, function(num) {
        return function(item) {
          action(num, item)
          
          done += 1
          
          // -> _.after() ?
          if (done >= len) {
            return after()
          }
        }
      }(i))

      i += 1
    });
  } else {
    return after()
  }
}

