'use strict';
var SecretController = require('../../../controllers').SecretController;

exports.addRoutes = function(app) {
  app.get('/secret/posts', SecretController.sendPosts);
  app.get('/secret/cmts', SecretController.sendCmts);
  app.get('/secret/user/:username', SecretController.sendUserPub);
  app.get('/secret/token', SecretController.sendToken);
  app.get('/secret/data', SecretController.sendUserPriv);
  app.post('/secret/register', SecretController.register);
  app.post('/secret/update', SecretController.update);
  app.post('/secret/post', SecretController.post);
  app.put('/secret/edit', SecretController.editP);
  app.delete('/secret/delete', SecretController.deleteP);
}
