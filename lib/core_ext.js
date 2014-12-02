Object.extend = function(destination, source) {
  for (var property in source) {
    if (source.hasOwnProperty(property)) {
      destination[property] = source[property];
    }
  }
  return destination;
}

Array.prototype.compact = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {
      this.splice(i, 1);
      i--;
    }
  }
  return this;
}

Array.prototype.flatten = function() {
  var merged = []
  return merged.concat.apply(merged, this)
}

Array.prototype.append = function(array) {
  this.push.apply(this, array)
}

String.prototype.truncate = function(n) {
  return this.substr(0,n-1) + (this.length>n ? '...' : '');
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
