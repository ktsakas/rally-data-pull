var express = require("express"),
	app = express(),
	bodyParser = require('body-parser'),
	config = require('./config'),
	l = config.logger;

var elasticsearch = require('elasticsearch'),
	esClient = new elasticsearch.Client(config.elastic);

app.use(bodyParser.json())
   .use(bodyParser.urlencoded({ extended: false }))
   .use(bodyParser.text());

app.get('/', (req, res) => res.json({ elastic: config.elastic.host, kibana: config.kibana.host }));

app.post('/webhook', function (req, res) {
	esClient.index({
		index: "webhooks",
		type: "TestBed",
		body: {
			headers: req.headers,
			params: req.query,
			body: req.body
		}
	}).then(function (res) {
		if (res.created == true) {
			l.info("webhook request successfull");
		} else {
			l.error("failed to insert webhook into elastic.")
		}
	});
	
	res.json({ headers: req.headers, query: req.query, body: req.body });
});

app.use(function(req, res){
	l.warn("Called false route.")

	res.send("Only supports post requests to /webhook.");
});

esClient.ping({
	requestTimeout: 1000
}, function (error) {
	if (error) {
		console.log("Unable to connect to elastic at: " + config.elastic.host);
	} else {
		app.listen(config.port, () => l.info("Chatbot listening on 127.0.0.1:" + config.port));
	}
});