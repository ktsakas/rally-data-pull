var express = require("express"),
	config = require('./config'),
	l = config.logger;

var elasticsearch = require('elasticsearch'),
	esClient = new elasticsearch.Client(config.elastic);

app.use(bodyParser.json())
   .use(bodyParser.urlencoded({ extended: false }));

// Store webhook requests in elastic
app.get('/webhook', function (req, res) {
	esClient.index({
		index: "webhooks",
		type: "TestBed",
		body: req
	});
});

esClient.ping({
	requestTimeout: Infinity
}, function (error) {
	if (error) {
		console.log("Unable to connect to elastic at: " + config.elastic.host);
	} else {
		app.listen(config.port, () => l.info("Chatbot listening on 127.0.0.1:" + port));
	}
});