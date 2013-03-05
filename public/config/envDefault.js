Config = {}
Config.loadScripts = function(){
  var labellingFilePath = '/config/locales/default.js'

  $(document.body).append("<script src='" + labellingFilePath + "'></script>")
  $(document.body).append("<script src='/js/app/app.js'></script>")
}
