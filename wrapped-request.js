var config = require('./config/config'),
	l = config.logger,
	Promise = require('bluebird'),
	// rp = require('request-promise'),
	rp = require('request'),
	fs = Promise.promisifyAll(require('fs')),
	queryString = require('querystring'),
	sanitize = require("sanitize-filename"),
	crypto = require('crypto'),
	async = require('async');


var cache = false,
	requestQueue = async.queue(function (requestFn, callback) {
		requestFn(callback);
	}, 3);

function WrappedRequest (req) {
	if (cache && req.method == 'GET') {
		return WrappedRequest.cachedRequest(req);
	} else {
		return WrappedRequest.repeatOnErrorRequest(req);
	}
}

WrappedRequest.rateLimitedRequest = function (req) {
	return Promise.promisify(requestQueue.push)( rp.bind(rp, req) )
		.then((res) => res.body);
}

WrappedRequest.repeatOnErrorRequest = function (req) {
	return WrappedRequest
		.rateLimitedRequest(req)
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
};

WrappedRequest.cachedRequest = function (req) {
	// File path for cached response
	var queryURL = req.uri + "?" + queryString.unescape(queryString.stringify(req.qs)),
		fileName = crypto.createHash('md5').update(queryURL).digest('hex'),
		filePath = "./cached-responses/" + fileName;

			// Try to find cached response
	return fs.readFileAsync(filePath, 'utf8')

			// Parse from string to json
			.then((contents) => {
				try {
					return JSON.parse(contents);
				} catch (e) {
					l.error("Non-json response cached.");
					process.exit(1);
				}
			})

			// If you dont find the response in the cache
			.catch((err) => {
				return WrappedRequest
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
};

WrappedRequest.defaults = function (options) {
	if (options.cache) {
		cache = options.cache;
		delete options.cache;
	}

	rp = rp.defaults(options);
	return WrappedRequest;
};

module.exports = WrappedRequest;