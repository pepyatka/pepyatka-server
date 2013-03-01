(function($) {
  $.fn.highlightSearchResults = function(searchQuery) {
    if (!searchQuery)
    {
      return;
    }

    var queryWords = [];
    searchQuery = searchQuery.replace(/ +(?!AND)(?!OR)/g, ' AND ');
    searchQuery = searchQuery.replace(/ AND AND /g, ' AND ');
    searchQuery = searchQuery.replace(/ OR AND /g, ' OR ');
    searchQuery.split(' OR ').forEach(function(splitedByORQuery){
      splitedByORQuery.split(' AND ').forEach(function(splitedByANDQuery){
        splitedByANDQuery = splitedByANDQuery.trim();
        splitedByANDQuery = splitedByANDQuery.replace(/intitle:|incomments:|from:/, '');
        queryWords.push(splitedByANDQuery);
      });
    });

    var queryWordsRegExp = new RegExp(queryWords.join('|'), 'gi');
    // Test a text node's contents for search word and split and rebuild it with an <strong>
    var testAndTag = function(el) {
      // Test for search word along whitespace and punctuation boundaries
      var m = el.nodeValue.match(queryWordsRegExp);
      // If we've found a valid search word, m[0] contains the search word
      if (m) {
        // Clone the text node to hold the "tail end" of the split node
        var tail = $(el).clone()[0];

        // Substring the nodeValue attribute of the text nodes based on the match boundaries
        el.nodeValue = el.nodeValue.substring(0, el.nodeValue.indexOf(m[0]));
        tail.nodeValue = tail.nodeValue.substring(tail.nodeValue.indexOf(m[0]) + m[0].length);

        // Rebuild the DOM inserting the new bold search word between the split text nodes
        $(el).after(tail).after($("<strong></strong>").html(m[0]));

        // Recurse on the new tail node to check for more search words
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

