"use strict";

if (!process.env.PROD) {
	const dotenv = require('dotenv').config({ path: ".env" });
}

var elastic = require('elasticsearch'),
	winston = require('winston'),
	logger = new (winston.Logger)({
		transports: [
			new (winston.transports.Console)({ prettyPrint: true, level: 'silly' })
		]
	}),
	host = process.env.PROD ? "na-testl01.gain.tcprod.local" : "127.0.0.1";


var config = {
	debug: true,

	// Winston logger
	logger: logger,

	// Port to run the server that recieves webhooks
	port: process.env.PORT || 3000,
	
	// Link to recieve webhooks from Rally
	webhookURL: host + ":" + config.port + "/webhook",

	rally: {
		// Rally username
		user: process.env.RALLY_USER,
		// Rally password
		pass: process.env.RALLY_PASS,
		// Rally api key (used for webhooks)
		apiKey: process.env.RALLY_APIKEY,
		server: "https://rally1.rallydev.com",

		// Workspace ID and UUID to pull the data from
		// currently those of the TravelClick workspace
		workspaceID: 6692415259,
		workspaceUUID: "b03e6b6f-0641-4a50-9490-c7a37d8e87a0",

		// Reservations: 6716826537
		projectID: 6716826537,
	},

	elastic: {
		host: "127.0.0.1:9200",
		log: "error",

		// ElasticSearch index and typ to store the revisions
		index: "rally",
		type: "revision"
	},

	// ElasticSearch client
	esClient: new elastic.Client({
		host: config.elastic.host,
		log: "error",
	})
};

module.exports = config;