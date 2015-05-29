var Scarlet = require('scarlet')

var scarlet = Scarlet()

exports.profile = function(klass) {
  for (fn in klass) {
    if (typeof klass[fn] != "function")
      continue
    klass[fn] = function(f) {
      return scarlet.intercept(klass[f]).
        using(function(invocation, proceed) {
          var args = invocation.args.filter(function(e) { return typeof(e) != 'function' }).map(function(e) { return JSON.stringify(e) })
          console.log(klass.name + "." + f + "( " + args.join(", ") + " )")
          proceed()
        }).
        proxy()
    }(fn)
  }

  for (fn in klass.prototype) {
    if (typeof klass.prototype[fn] != "function")
      continue
    klass.prototype[fn] = function(f) {
      return scarlet.intercept(klass.prototype[fn]).
        using(function(invocation, proceed) {
          var args = invocation.args.filter(function(e) { return typeof(e) != 'function' }).map(function(e) { return JSON.stringify(e) })
          console.log(klass.name + "." + f + "( " + args.join(", ") + " )")
          proceed()
        }).
        proxy()
    }(fn)
  }
}
