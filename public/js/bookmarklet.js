javascript:(function(){

  var v = "1.9.1";

  if (window.jQuery === undefined || window.jQuery.fn.jquery < v) {
    var done = false;
    var script = document.createElement("script");
    script.src = "http://ajax.googleapis.com/ajax/libs/jquery/" + v + "/jquery.min.js";
    script.onload = script.onreadystatechange = function(){
      if (!done && (!this.readyState || this.readyState == "loaded" || this.readyState == "complete")) {
        done = true;
        initMyBookmarklet();
      }
    };
    document.getElementsByTagName("head")[0].appendChild(script);
  } else {
    initMyBookmarklet();
  }

  function initMyBookmarklet() {
    (window.myBookmarklet = function() {
      function getSelText() {
        var s = '';
        if (window.getSelection) {
          s = window.getSelection();
        } else if (document.getSelection) {
          s = document.getSelection();
        } else if (document.selection) {
          s = document.selection.createRange().text;
        }
        return s;
      }
      var addScript=function(filename,callback){
        var e=document.createElement('script');
        e.type = 'text/javascript';
        e.src = filename;
        if(callback){
          e.onloadDone=false;//for Opera
          e.onload=function(){e.onloadDone=true;callback();};
          e.onReadystatechange=function(){
            if(e.readyState==='loaded'&& !e.onloadDone){
              e.onloadDone=true;callback();
            }
          }
        }
        if(typeof(e)!=='undefined'){
          document.getElementsByTagName('head')[0].appendChild(e);
        }
      }
      addScript('http://pepyatka.com/js/pepyatka.js',function(){pepyatka_highlight();});
    })();
  }

})();
