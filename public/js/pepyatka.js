function p_unload() {
  jQuery('#p_pepyatka').remove();
  jQuery('#p_block').remove();
  jQuery('.p_link').remove();

  p_unbind();
}

function p_unbind() {
  jQuery('img').unbind('mouseenter');
  jQuery('img').unbind('click');
}

function p_upload(url) {
  var host = jQuery('#p_frame').attr('src').split('#')[0];
  host = host + '#' + url

  jQuery('#p_frame').attr('src', host);
}

function p_getSelectionText() {
  var text = "";
  if (window.getSelection) {
    text = window.getSelection().toString();
  } else if (document.selection && document.selection.type != "Control") {
    text = document.selection.createRange().text;
  }
  return text;
}

function p_highlight() {
  var p_e;
  var host = 'http://pepyatka.com';

  p_unload();

  jQuery('<div id="p_pepyatka" style="display:none;border:3px solid blue;position:absolute;overflow:hidden;cursor:pointer">'
         + '<div id="p_inner"></div>'
         + '<div id="p_title" style="background-color:white;font-size:0.7em;color:blue;padding:0.2em">Select image</div>'
         + '</div>').appendTo('body');

  jQuery('<div id="p_block" />').appendTo('body');
  jQuery('#p_block')
    .css({position:'absolute', width:'auto', 'z-index':100000, top:0, right:0,
         'border-left':'6px solid #aaa', 'border-bottom':'6px solid #aaa',
         'border-top':0, 'border-right':0, height:'200px', width:'300px',
         'background-color':'#fff'});

  var comment = encodeURIComponent(p_getSelectionText())
  var title = encodeURIComponent(document.title) + " - " + document.URL
  jQuery('<iframe name="p_frame" id="p_frame" src="' + host + '/bookmarklet?comment=' + comment + '&title=' + title + '" />').appendTo('#p_block');
  jQuery('#p_frame')
    .css({height:'160px', position:'absolute', right:0, top:'6px', width:'300px',
          border:0});

  jQuery('<div style="position:absolute;right:6px;top:6px" id="p_close"><a href="javascript:void(0)"><img src="' + host + '/img/close-white.png" /></a></div>')
    .appendTo('#p_block')
    .click(function() { p_unload(); });

  jQuery('#p_block').css('top', jQuery(this).scrollTop() + "px");
  jQuery(window).scroll(function() {
    jQuery('#p_block').css('top', jQuery(this).scrollTop() + "px");
  });

  jQuery('img').mouseenter(
    function () {
      p_e = jQuery(this);
      if (jQuery(p_e).find('img').length > 0)
        p_e = jQuery(p_e).find('img'); // nested images have higher priority
      var p = jQuery(p_e).offset();
      jQuery('#p_pepyatka')
        .css({left: p.left, top: p.top})
        .width(jQuery(p_e).outerWidth()-6)
        .height(jQuery(p_e).outerHeight()-6)
        .show();
    }
  );
  jQuery('#p_pepyatka').mouseleave(
    function () { jQuery('#p_pepyatka').hide(); }
  );

  jQuery('#p_pepyatka,img').click(
    function () {
      var url = jQuery(p_e)[0].href || jQuery(p_e)[0].src;
      p_upload(url);
    }
  );
}
