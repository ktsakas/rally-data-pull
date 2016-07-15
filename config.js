const dotenv = require('dotenv').config({ path: ".env" });
var winston = require('winston'),
	logger = new (winston.Logger)({
		transports: [
			new (winston.transports.Console)({ level : 'silly' })
		]
	})

module.exports = {
	logger: logger,

	rally: {
		user: process.env.USER,
		pass: process.env.PASS,
		server: "https://rally1.rallydev.com",
	},

	elastic: {
		host: "localhost:9200",
		log: "error",
	}
};