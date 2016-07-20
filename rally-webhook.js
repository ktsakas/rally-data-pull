var express = require("express"),
	app = express(),
	bodyParser = require('body-parser'),
	config = require('./config'),
	l = config.logger,
	moment = require('moment');

var elasticsearch = require('elasticsearch'),
	esClient = config.esClient;

app.use(bodyParser.json())
   .use(bodyParser.urlencoded({ extended: false }))
   .use(bodyParser.text());

function normalizeValues(object) {
	for (var key in object) {
		if (typeof object[key] == "number") {
			object["num_" + key] = object[key];
			delete object[key];
		}

		if (object[key] != null && typeof object[key] == "object") {
			object["obj_" + key] = JSON.stringify(object[key]);
			delete object[key];
		}

		if ( new Date(object[key]) != "Invalid Date" ) {
			object["date_" + key] = object[key];
			delete object[key];
		}

		if ( typeof object[key] == "boolean" ) {
			object["bool_" + key] = object[key];
			delete object[key];
		}
	}

	return object;
}

function keysToArray(objects) {
	var array = [];

	for (var key in objects) {
		var obj = normalizeValues(objects[key]);

		obj.key = key;
		array.push(obj);
	}

	return array;
}

app.post('/webhook', function (req, res) {
	l.debug("Route /webhook was called.");

	var message = req.body.message;
	message.changes = keysToArray(message.changes);
	message.state = keysToArray(message.state);

	esClient
		.index({
			index: "webhooks",
			type: "TestBed",
			body: message
		})
		.catch((err) => l.error("Failed to insert webhook request into elastic.", err))
		.then((res) => l.debug("Webhook request indexed into elastic."));

	res.json(message);
});

app.use(function(req, res){
	l.warn("Called route other than /webhook.");

	res.json({ elastic: config.elastic.host, kibana: config.kibana.host })
});

esClient.ping({
	requestTimeout: 1000
}, function (error) {
	if (error) {
		l.info("Unable to connect to elastic at " + config.elastic.host);
	} else {
		app.listen(config.port, () => l.info("Chatbot listening on 127.0.0.1 " + config.port));
	}
});