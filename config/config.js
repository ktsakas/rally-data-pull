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
		server: "https://rally1.rallydev.com",

		workspace: "https://rally1.rallydev.com/slm/webservice/v2.0/workspace/5339961604",
		project: null
	},

	kibana: {
		host: "http://83684862.ngrok.io"
	},

	elastic: {
		host: "http://faf61a25.ngrok.io",
		// host: "localhost:9200",
		log: "error",

		index: "test",

		types: {
			webhook: "webhook",
			raw_artifact: "raw_artifact",
			artifact: "artifact",
			revision: "revision"
		}
	},

	esClient: new elastic.Client({
		host: "http://faf61a25.ngrok.io",
		// host: "localhost:9200",
		log: "error",
	})
};