exports.getAppConfig = function () {
  configValues = {
    secret: 'sectet token',
    saltSecret: 'sectet token',
    port: 3000,
    loggerLevel: 'info'
  }

  return configValues;
}
