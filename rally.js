const _ = require('underscore'),
	  config = require('./config'),
	  l = config.logger;

var elasticsearch = require('elasticsearch'),
	client = new elasticsearch.Client(config.elastic),
	rally = require('rally');

var queryUtils = rally.util.query,
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
		batch.push({ index: { "_index": "rally", "_type": "TestBed" } });

		artifact["type"] = artifact["_type"];
		delete artifact["_type"];
		artifact = _(artifact).pick(function(value, key, object) {
			return key != "_type";
		});

		batch.push(artifact);
	});

	return batch;
}

function pullAll(start) {
	start = start || 1;

	restApi.query({
		type: 'artifact',
		start: start,
		pageSize: 200,
		fetch: "true"
	}, function(error, result) {
		var count = result.Results.length;
		console.log(count);

		if (count == 200) {
			pullAll(start + 200);
		}

		client.bulk({
			body: toElastic(result.Results)
		}, function (err, resp) {
			console.log("error: ", err);
			console.log("resp: ", resp.items[0]);
			if (err) console.log(err);
			else console.log(resp.took);
		});
	});
}

client.ping({
	requestTimeout: Infinity
}, function (error) {
	if (error) {
		console.log("Unable to connect to elastic at: " + config.elastic.host);
	} else {
		console.log("Connected to elastic at: " + config.elastic.host);
		pullAll();
	}
});