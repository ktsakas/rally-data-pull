const _ = require('underscore'),
	  config = require('./config.js');

var winston = require('winston'),
	l = new (winston.Logger)({ level: 'silly' }),
	elasticsearch = require('elasticsearch'),
	client = new elasticsearch.Client(config.elastic),
	rally = require('rally');

l.level = 'silly';

console.log(config.rally.user, config.rally.pass, config.rally.server);

/*var queryUtils = rally.util.query,
	restApi = rally({
		user: config.rally.user,
		pass: config.rally.pass,
		apiVersion: 'v2.0',
		server: config.rally.server,
		requestOptions: {
			headers: {
				'X-RallyIntegrationName': 'User Story Kibana Analysis',
				'X-RallyIntegrationVendor': 'TravelClick',
				'X-RallyIntegrationVersion': '1.0'
			}
		}
	});


function toElastic (artifacts) {
	var batch = [];
	var first = true;
	artifacts.forEach(function (artifact) {
		batch.push({ index: { "_index": "rally", "_type": "artifact" } });

		artifact["type"] = artifact["_type"];
		delete artifact["_type"];
		artifact = _(artifact).pick(function(value, key, object) {
			return key != "_type";
		});

		batch.push(artifact);
	});

	return batch;
}

// for (var i = 0; i < 10; i++) {
	restApi.query({
		type: 'artifact', //the type to query
		start: 1, //the 1-based start index, defaults to 1
		pageSize: 200, //the page size (1-200, defaults to 200)
		fetch: "true"
	}, function(error, result) {
		console.log(result.Results[0].length);
		client.bulk({
			body: toElastic(result.Results)
		}, function (err, resp) {
			console.log("error: ", err);
			console.log("resp: ", resp.items[0]);
			if (err) console.log(err);
			else console.log(resp.took);
		});
	});*/
// }