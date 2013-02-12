var ElasticSearchClient = require('elasticsearchclient');
var serverOptions = {
    host: 'localhost',
    port: 9200
};

exports.elasticSearchClient = new ElasticSearchClient(serverOptions);