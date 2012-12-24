exports.getSiteConfig = function () {
  configValues = {
    url: 'http://localhost:3000',
    site_name: 'PopBroker',
    site_email: 'seuemail@email.com.br',
    db: {
     db: 'popbroker',
     host: 'localhost',
    }
    secret: 'lethus123'
  }

  return configValues;
}

exports.getMailConfig = function () {
  configValues = {
    host: 'smtp.gmail.com',
    username: 'seuemail@email.com.br',
    password: 'senha-aqui'
  }

  return configValues;
}