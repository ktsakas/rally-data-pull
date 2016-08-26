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


module.exports = {
	debug: true,
	logger: logger,
	port: process.env.PORT || 3000,
	webhookURL: host + ":3000/webhook",

	rally: {
		user: process.env.USER,
		pass: process.env.PASS,
		apiKey: process.env.APIKEY,
		server: "https://rally1.rallydev.com",

		workspaceID: 6692415259,// 5339961604,
		workspaceUUID: "b03e6b6f-0641-4a50-9490-c7a37d8e87a0",

		// Reservations: 6716826537
		projectID: 6716826537,
	},

	elastic: {
		host: "127.0.0.1:9200",
		log: "error",

		index: "fixed",
		type: "revision"
	},

	esClient: new elastic.Client({
		host: "127.0.0.1:9200",
		log: "error",
	})
};