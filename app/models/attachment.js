var uuid = require('node-uuid')
  , models = require('../models');

exports.addModel = function(db) {
  function Attachment(params) {
    console.log('new Attachment(' + params + ')')
    this.id = params.id
  }

  Attachment.find = function(attachmentId, callback) {
    console.log('Attachment.find("' + attachmentId + '")')
  },

  Attachment.prototype = {
    toJSON: function(callback) {
      console.log('- attachment.toJSON()')
      return callback({
        id: this.id
      })
    }

  }
  
  return Attachment;
}
