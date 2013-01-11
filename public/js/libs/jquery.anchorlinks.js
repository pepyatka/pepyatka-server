(function($) {
  $.fn.anchorTextUrls = function() {
    // Test a text node's contents for URLs and split and rebuild it with an achor
    var testAndTag = function(el) {
      // Test for URLs along whitespace and punctuation boundaries (don't look too hard or you will be consumed)
      var m = el.nodeValue.match(/(https?:\/\/.*?)[.!?;,]?(\s+|"|$)/);

      // If we've found a valid URL, m[1] contains the URL
      if (m) {
        // Clone the text node to hold the "tail end" of the split node
        var tail = $(el).clone()[0];

        // Substring the nodeValue attribute of the text nodes based on the match boundaries
        el.nodeValue = el.nodeValue.substring(0, el.nodeValue.indexOf(m[1]));
        tail.nodeValue = tail.nodeValue.substring(tail.nodeValue.indexOf(m[1]) + m[1].length);

        // Rebuild the DOM inserting the new anchor element between the split text nodes
        $(el).after(tail).after($("<a></a>").attr("href", m[1]).html(m[1]));

        // Recurse on the new tail node to check for more URLs
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
