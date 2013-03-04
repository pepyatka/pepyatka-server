Config = {}
Config.getLabellingFile = function(){
  var labellingFilePath = '/config/locales/default.js'
  $.getScript(labellingFilePath)
}

Config.getLabellingFile()