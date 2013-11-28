var async = require('async')

// NOTE: the code below is excessively confusing I'd rather introduce
// new abstract object or something rather than doing recursion after
// recursion in a dynamic language. You have been warned.
exports.addSerializer = function() {
  function AbstractSerializer(object, strategy) {
    this.object = object
    this.strategy = strategy
  }

  AbstractSerializer.prototype = {
    toJSON: function(callback) {
      var that = this
        , strategy = this.strategy
        , json = {}

      // that function selects inner complex properties, we'll use it
      // a bit later
      // complex property is a property that we need to select by
      // defined strategy and has custom structure, e.g. info is a
      // complex property in a example
      // var strategy = {
      //   select: ['id', 'username', 'type', 'info', 'rss'],
      //   info: { select: ['screenName'] }
      // }
      var selectComplexProperties = function(strategy, subfield, object, callback) {
          async.map(strategy, function(field, callback) {
            if (object[field]) { // object has that property, moving on
              json[subfield] = json[subfield] || {}
              json[subfield][field] = object[field]
              callback(object[field])
            } else { // property is missing and as we don't know db
              // structure we'll use model methods that probably
              // and we hope exist
              // we are assuming that there is a function get<Something> where
              // <Something> is a name of a property or an object that
              // we are going to select
              // TODO: not sure we really need this block here... it
              // might happen we'll need to get fields by "'get' +
              // subfield.capitalize()" function
              var name = 'get' + field.capitalize()
              object[name](function(err, res) {
                callback(err, res)
              })
            }
          }, function(err, json) {
            // we have fetched all inner properties
            callback(err)
          })
      }

      var selectPropertiesViaSerializator = function(field, object, serializer, callback) {
        var fn = function(object) {
          var objectSerializer = new serializer(object)
          objectSerializer.toJSON(function(objectJson) {
            json[field] = objectJson
            callback(null)
          })
        }

        if (object) {
          fn(object)
        } else {
          // TODO: code below duplicates code from
          // selectComplexProperties function
          var name = 'get' + field.capitalize()
          that.object[name](function(err, object) {
            fn(object)
          })
        }
      }

      async.forEach(strategy.select, function(field, callback) {
        // TODO: some of strategy might be already exist in the object
        // if (that.object[field]) { // this field is already present
        // in the object

        // this is a complex property
        if (strategy[field] && (strategy[field].select || strategy[field].through)) {
          // now we need to either ensure all properties are there
          // or fetch missing from the db

          // Liberté, égalité, fraternité. Object and array of objects
          // must be living together.
          var objects = that.object
          if (!Array.isArray(objects))
            objects = [objects]

          async.forEach(objects, function(object, callback) {
            var guineaPig = object[field]

            if (strategy[field].select) // this is a plain structure
              selectComplexProperties(strategy[field].select,
                                      field,
                                      guineaPig, callback)
            else if (strategy[field].through) // we have been told to select that
              // property through existing serializator
              selectPropertiesViaSerializator(field,
                                              guineaPig,
                                              strategy[field].through,
                                              callback)
          }, function(err) {
            callback(err)
          })
        } else {
          json[field] = that.object[field]
          callback(null)
        }
      }, function(err) {
        callback(json)
      })
    }
  }

  return AbstractSerializer
}
