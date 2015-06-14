require("babel/register")({
  stage: 1
});

GLOBAL.$redis = require('../config/database')
  , GLOBAL.$database = $redis.connect()
  , GLOBAL.$should = require('chai').should()
