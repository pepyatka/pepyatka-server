exports.getAppConfig = function () {
  configValues = {
    domain: 'app_name',

    secret: 'sectet token',
    saltSecret: 'sectet token',
    port: 3000,
    loggerLevel: 'info',
    remoteUser: false
  }

  return configValues;
}

exports.getHTMLClientConfig = function() {
  return {
    origin: 'http://localhost:3333'
  }
}

exports.getMailerConfig = function() {
  return {
    domain: 'domain',

    host: "host",
    secureConnection: true,
    port: 465,

    sendFromName: 'from_address',
    sendFromEmail: 'email_address',
    serviceEmail: 'email_address',
    servicePass: 'password'
  }
}

exports.getElasticSearchConfig = function() {
  serverOptions = {
    host: 'localhost',
    port: 9200
  }

  return serverOptions;
}

exports.isAnonymousPermitted = function() {
  var isPermitted = true;

  return isPermitted;
}

exports.getWordWhichEqualHashTag = function() {
  var wordWhichEqualHashTag = 'hashtagsym';

  return wordWhichEqualHashTag;
}

exports.getStatisticsTopCount = function() {
  var topCount = 20

  return topCount
}
