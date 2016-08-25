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
	})

module.exports = {
	debug: true,
	logger: logger,
	port: process.env.PORT || 3000,

	rally: {
		user: process.env.USER,
		pass: process.env.PASS,
		apiKey: process.env.APIKEY,
		server: "https://rally1.rallydev.com",

		workspaceID: 6692415259,// 5339961604,

		// Reservations: 6716826537
		projectID: 6716826537,
	},

	kibana: {
		host: "127.0.0.1:5601"//"http://83684862.ngrok.io"
	},

	elastic: {
		// host: "127.0.0.1:9200",
		host: "127.0.0.1:9200",
		log: "error",

		index: "rally",

		types: {
			webhook: "webhook",
			raw_artifact: "raw_artifact",
			artifact: "artifact",
			revision: "revision"
		}
	},

	esClient: new elastic.Client({
		// host: "http://faf61a25.ngrok.io",
		host: "127.0.0.1:9200",
		// host: "localhost:9200",
		log: "error",
	})
};