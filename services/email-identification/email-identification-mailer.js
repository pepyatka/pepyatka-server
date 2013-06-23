var nodemailer = require('nodemailer');

exports.sendMailToUser = function(conf, message) {
  var transport = nodemailer.createTransport("SMTP", {
    auth: {
      user: conf.serviceEmail,
      pass: conf.servicePass
    }
  });

  console.log('SMTP Configured');
  console.log('Sending Mail');

  message.from = conf.sendFromName + ' <' + conf.sendFromEmail + '>',
  message.headers = {
    'X-Laziness-level': 1000
  },

  transport.sendMail(message, function(error) {
    if (error) {
      console.log('Error occured');
      console.log(error.message);
      return
    }

    console.log('Message sent successfully!');

    transport.close();
  });
}
