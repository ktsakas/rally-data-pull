const dotenv = require('dotenv');

module.exports = {
	rally: {
		user: process.env.USER,
		pass: process.env.PASS,
		server: "https://sandbox.rallydev.com"
	},

	elastic: {
		host: "localhost:9200",
		log: "error"
	}
};