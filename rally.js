const _ = require('underscore'),
	  config = require('./config'),
	  l = config.logger,
	  esClient = config.esClient;

/*var elasticsearch = require('elasticsearch'),
	esClient = new elasticsearch.Client(config.elastic);
*/
var rallyUtils = require('./rally-utils');


/*function toElastic (artifacts) {
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
		scope: {
			workspace: "https://rally1.rallydev.com/slm/webservice/v2.0/workspace/5339961604",
		},
		start: start,
		pageSize: 1,
		fetch: "true"
	}, function(error, result) {
		// console.log("raw: ", result.Results[0]);
		var mappedArtifacts = result.Results.map(artifactTranslator.translate.bind(artifactTranslator));

		var count = result.Results.length;
		console.log(count);

		if (count == 200) {
			pullAll(start + 200);
		}

		esClient.bulk({
			body: toElastic(mappedArtifacts)
		}, function (err, resp) {
			console.log("error: ", err);
			console.log("resp: ", resp.items[0]);
			if (err) console.log(err);
			else console.log(resp.took);
		});
	});
}*/

/*esClient.indices.create({
	index: "rally",
	body: {
		mappings: {
			artifact: {
				properties: {}
			},
			revision: {
				_parent: { type: "artifact" }
			}
		}
	}
}).catch((err) => {
	l.error(err);
});*/

esClient
	.ping()
	.catch((err) => l.error("Unable to connect to elastic at " + config.elastic.host))
	.then(() => l.info("Connected to elastic at: " + config.elastic.host))
	.then(() => rallyUtils.pullAll());