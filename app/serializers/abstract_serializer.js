var async = require('async');

var replicate = function(n, x) {
  if (n <= 0) {
    return [];
  } else {
    return [x].concat(replicate(n - 1, x));
  }
};

// Sometimes getters are having more then one argument, filling those
// arguments with nulls here, assuming last argument is a callback for
// return value.
var funcall = function(context, f, callback) {
  f.apply(context, replicate(f.length - 1, null).concat([callback]));
};

exports.addSerializer = function() {
  var AbstractSerializer = function(object, strategy) {
    this.object   = object;
    this.strategy = strategy;
  };

  AbstractSerializer.prototype = {
    END_POINT: 1,
    NESTED_STRATEGY: 2,
    THROUGH_POINT: 3,

    getField: function(field, f) {
      if (!this.object) {
        f(null, null);
      } else if (!this.object[field]) {
        var method = this.object["get" + field.capitalize()];

        method ? funcall(this.object, method, f) : f(null, null);
      } else {
        f(null, this.object[field]);
      }
    },

    decideNode: function(field) {
      if (!this.strategy[field]) {
        return this.END_POINT;
      } else {
        if (this.strategy[field].through) {
          return this.THROUGH_POINT;
        } else {
          return this.NESTED_STRATEGY;
        }
      }
    },

    prepareNestedField: function(name) {
      var nestedField = name

      if (name[name.length - 1] === 's') {
        nestedField = name.substr(0, name.length-1) + "Ids"
      } else {
        nestedField += "Id"
      }

      return nestedField
    },

    processMultiObjects: function(objects, strategy, serializer, root, level, f) {
      var result = [];
      var jsonAdder = function(done) {
        return function(err, json) {
          result.push(json);
          done(err);
        };
      };

      async.forEach(objects, function(object, done) {
        if (serializer) {
          new serializer(object).toJSON(jsonAdder(done), root, level + 1);
        } else {
          new AbstractSerializer(object, strategy).toJSON(jsonAdder(done), root, level + 1);
        }
      }, function(err) {
        f(err, result);
      });
    },

    processMultiObjectsWithRoot: function(field, objects, strategy, serializer, root, level, f) {
      var result = [];
      var jsonAdder = function(done) {
        return function(err, json) {
          result.push(json);
          done(err);
        };
      };

      async.forEach(objects, function(object, done) {
        if (serializer) {
          new serializer(object).toJSON(jsonAdder(done), root, level + 1);
        } else {
          new AbstractSerializer(object, strategy).toJSON(jsonAdder(done), root, level + 1);
        }
      }, function(err) {
        if (typeof root[field] === 'undefined') {
          root[field] = result
        } else {
          root[field] = Object.extend(root[field], result)
        }

        f(err)
      });
    },

    getMaybeObjects: function(field, one, many) {
      this.getField(field, function(err, object) {
        Array.isArray(object) ? many(object) : one(object);
      });
    },

    processNestedStrategy: function(field, f, root, level) {
      var serializer = this;

      serializer.getMaybeObjects(field, function(object) {
        new AbstractSerializer(object, serializer.strategy[field]).toJSON(f, root, level + 1);
      }, function(objects) {
        serializer.processMultiObjects(objects, serializer.strategy[field], null, root, level, f);
      });
    },

    processThroughPoint: function(field, f, root, level) {
      var serializer = this;

      serializer.getMaybeObjects(field, function(object) {
        if (serializer.strategy[field].embed) {
          var object_id = object.id

          f(null, object_id)
        } else {
          new serializer.strategy[field].through(object).toJSON(f);
        }
      }, function(objects) {
        var object_ids = objects.map(function(e) { return e.id })

        if (serializer.strategy[field].embed)
          serializer.processMultiObjectsWithRoot(field, objects, serializer.strategy[field], serializer.strategy[field].through, root, level, function(err) {
            f(err, object_ids)
          })
        else {
          serializer.processMultiObjects(objects, null, serializer.strategy[field].through, root, level, f)
        }
      });
    },

    processNode: function(jsonAdder, root, level) {
      var serializer = this;

      return function(field, done) {
        switch (serializer.decideNode(field)) {

        case serializer.END_POINT:
          serializer.getField(field, jsonAdder(field, done));
          break;

        case serializer.NESTED_STRATEGY:
          serializer.processNestedStrategy(field, jsonAdder(field, done), root, level);
          break;

        case serializer.THROUGH_POINT:
          var node = serializer.embed ? serializer.prepareNestedField(field) : field
          serializer.processThroughPoint(field, jsonAdder(node, done), root, level);
          break;
        }
      };
    },

    toJSON: function(f, root, level) {
      var json = {};
      root = root || {}
      level = level || 0
      var jsonAdder = function(field, done) {
        return function(err, res) {
          json[field] = res;
          done(err);
        };
      };

      async.forEach(this.strategy.select, this.processNode(jsonAdder, root, level + 1) , function(err) {
        if (level === 0)
          json = Object.extend(json, root)

        f(err, json);
      });
    }
  };

  return AbstractSerializer;
};
