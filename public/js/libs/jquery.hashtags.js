(function($) {
  $.fn.hashTagsUrls = function() {
    // Test a text node's contents for hashtags and split and rebuild it with an achor
    var testAndTag = function(el) {
      // Test for hashtags along whitespace and punctuation boundaries
      var m = el.nodeValue.match(/#[А-Яа-я\w]+/);
      // If we've found a valid hashtag, m[0] contains the hashtags
      if (m) {
        // Clone the text node to hold the "tail end" of the split node
        var tail = $(el).clone()[0];

        // Substring the nodeValue attribute of the text nodes based on the match boundaries
        el.nodeValue = el.nodeValue.substring(0, el.nodeValue.indexOf(m[0]));
        tail.nodeValue = tail.nodeValue.substring(tail.nodeValue.indexOf(m[0]) + m[0].length);
        // Rebuild the DOM inserting the new hashtag link between the split text nodes
        var href = '/search/' + m[0].replace("#","%23");
        $(el).after(tail).after($("<a href=\'" + href + "\'></a>").html(m[0]));

        // Recurse on the new tail node to check for more hashtags
        testAndTag(tail);
      }

      // Behave like a function
      return false;
    }

    // For each element selected by jQuery
    this.each(function() {
      // Select all descendant nodes of the element and pick out only text nodes
      var textNodes = $(this).add("*", this).contents().filter(function() {
        return this.nodeType == 3
      });

      // Take action on each text node
      $.each(textNodes, function(i, el) {
        testAndTag(el);
      });
    });
  }
}(jQuery));
