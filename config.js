const dotenv = require('dotenv').config({ path: ".env" });
var winston = require('winston'),
	logger = new (winston.Logger)({
		transports: [
			new (winston.transports.Console)({ level : 'silly' })
		]
	})

module.exports = {
	logger: logger,
	port: process.env.PORT || 3000,

	rally: {
		user: process.env.USER,
		pass: process.env.PASS,
		server: "https://rally1.rallydev.com",
	},

	kibana: {
		host: "http://83684862.ngrok.io"
	},

	elastic: {
		host: "http://faf61a25.ngrok.io",
		// host: "localhost:9200",
		log: "error",
	}
};