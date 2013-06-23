var environment = require('./../environment.js')
  , service = require('./../services/update-user-info.js');

environment.init(function(err, res) {
  service.updateUserInfo();
})
