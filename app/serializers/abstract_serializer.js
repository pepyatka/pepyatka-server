var async = require('async');

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
      if (!this.object[field]) {
        this.object["get" + field.capitalize()](f);
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

    processMultiObjects: function(objects, strategy, f, serializer) {
      var result = [];
      var jsonAdder = function(done) {
        return function(err, json) {
          result.push(json);
          done(err);
        };
      };

      async.forEach(objects, function(object, done) {
        if (serializer) {
          new serializer(object).toJSON(jsonAdder(done));
        } else {
          new AbstractSerializer(object, strategy).toJSON(jsonAdder(done));
        }
      }, function(err) {
        f(err, result);
      });
    },

    getMaybeObjects: function(field, one, many) {
      this.getField(field, function(err, object) {
        Array.isArray(object) ? many(object) : one(object);
      });
    },

    processNestedStrategy: function(field, f) {
      var serializer = this;

      serializer.getMaybeObjects(field, function(object) {
        new AbstractSerializer(object, serializer.strategy[field]).toJSON(f);
      }, function(objects) {
        serializer.processMultiObjects(objects, serializer.strategy[field], f);
      });
    },

    processThroughPoint: function(field, f) {
      var serializer = this;

      serializer.getMaybeObjects(field, function(object) {
        new serializer.strategy[field].through(object).toJSON(f);
      }, function(objects) {
        serializer.processMultiObjects(objects, null, f, serializer.strategy[field].through);
      });
    },

    processNode: function(jsonAdder) {
      var serializer = this;

      return function(field, done) {
        switch (serializer.decideNode(field)) {

        case serializer.END_POINT:
          serializer.getField(field, jsonAdder(field, done));
          break;

        case serializer.NESTED_STRATEGY:
          serializer.processNestedStrategy(field, jsonAdder(field, done));
          break;

        case serializer.THROUGH_POINT:
          serializer.processThroughPoint(field, jsonAdder(field, done));
          break;
        }
      };
    },

    toJSON: function(f) {
      var json = {};
      var jsonAdder = function(field, done) {
        return function(err, res) {
          json[field] = res;
          done(err);
        };
      };

      async.forEach(this.strategy.select, this.processNode(jsonAdder) , function(err) {
        f(err, json);
      });
    }
  };

  return AbstractSerializer;
};
