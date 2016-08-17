var config = require('./config/config'),
	l = config.logger,
	Promise = require('bluebird'),
	rp = require('request-promise'),
	fs = Promise.promisifyAll(require('fs')),
	queryString = require('querystring'),
	sanitize = require("sanitize-filename"),
	crypto = require('crypto');


var cache = false;

class WrappedRequestPromise {
	constructor(req) {
		if (cache && req.method == 'GET') {
			return this.cachedRequest(req);
		} else {
			return this.repeatOnErrorRequest(req);
		}
	}

	repeatOnErrorRequest (req) {
		return rp(req)
				// Try the request again on error
				.catch((err) => {
					return rp(req);
				})
				// If you fail twice exit the program
				.catch((err) => {
					if (err.message === 'Error: ETIMEDOUT') {
						l.error("Connection timedout twice. Exiting...");
						process.exit(1);
					} else {
						throw err;
					}
				});
	}

	cachedRequest (req) {
		// File path for cached response
		var queryURL = req.uri + "?" + queryString.unescape(queryString.stringify(req.qs)),
			fileName = crypto.createHash('md5').update(queryURL).digest('hex'),
			filePath = "./cached-responses/" + fileName;

				// Try to find cached response
		return fs.readFileAsync(filePath, 'utf8')

				// Parse from string to json
				.then((contents) => JSON.parse(contents))

				// If you dont find the response in the cache
				.catch((err) => {
					return this
						.repeatOnErrorRequest(req)
						.then((res) => {
							var resString = JSON.stringify(res);

							try {
								fs.writeFileSync(filePath, resString);
							} catch(e) {
								l.error("Failed to cache request.", err);
								process.exit(1);
							}
							
							return res;
						});
				});

				// We should never fail to parse the JSON
				/*.catch((err) => {
					l.error("Failed to parse JSON. Exiting...", err);
					process.exit(1);
				});*/
	}

	static defaults(options) {
		if (options.cache) {
			cache = options.cache;
			delete options.cache;
		}

		rp = rp.defaults(options);
		return WrappedRequestPromise;
	}
}

module.exports = WrappedRequestPromise;